---
title: "Unused index analysis in SQL Server with master-slave setup"
subTitle: Approach and SQL DMV Queries
cover: sql.png
category: ["databases"]
---


We all love database indexes. They speed up our queries, can be used for enforcing constraints &, of course, improve DB throughput. 
We can keep adding indexes for each column permutation, but there is no such thing as a free lunch. Adding indexes comes at a cost. Mostly these:
* **Indexes take up space**: Indexes gotta live somewhere. 
* **Slow down updates**: Every INSERT/UPDATE/DELETE leads to updation of index pages which can be expensive considering the complexity of underlying data structure & size. Also, more writes increases wait time for other threads to acquire internal latches to the data structure, thereby increasing latency. 

With these things in mind, you never want to have indexes that do not aid in speeding up queries or maintaining consistency. So, if everyone knows that, why would we even have such indexes in the first place? The simple answer is software agility & ignorance.
As the software evolves, we tweak/delete/add queries. Indexes that cater to specific queries linger long after these queries are gone or modified to use a different set of indexes.

That being said, let's identify unused indexes.

## Unused indexes in SQL Server
SQL server maintains some statistics regarding usage of each index and updates it in real-time. We can run a few queries and gather some numbers.

Note that these statistics reset every time the server restarts. So make sure the server is up for a reasonable time for your analysis to be accurate, or you'll end up deleting an index that is useful but wasn't used in your analysis period.

```sql
--- Find Unused index in a SQL Server Database with allocated index size
SELECT *  
FROM (  
      SELECT objects.name AS Table_name,  
    indexes.name AS Index_name,  
    SUM(dm_db_index_usage_stats.user_seeks)   as user_seeks,  
    SUM(dm_db_index_usage_stats.user_scans)   as user_scans,  
    SUM(dm_db_index_usage_stats.user_lookups) as user_lookups,  
    SUM(dm_db_index_usage_stats.user_updates) as user_updates  
      FROM sys.dm_db_index_usage_stats  
      INNER JOIN sys.objects ON dm_db_index_usage_stats.OBJECT_ID = objects.OBJECT_ID  
    INNER JOIN sys.indexes ON indexes.index_id = dm_db_index_usage_stats.index_id AND  
      dm_db_index_usage_stats.OBJECT_ID = indexes.OBJECT_ID  
    WHERE indexes.is_primary_key = 0 --This line excludes primary key constarint  
      AND indexes.is_unique = 0 --This line excludes unique key constarint  
      AND indexes.type = 2  
    GROUP BY indexes.name, objects.name  
    HAVING SUM(dm_db_index_usage_stats.user_seeks) + SUM(dm_db_index_usage_stats.user_scans) +  
             SUM(dm_db_index_usage_stats.user_lookups) <= 0  
  ) AS index_op_stats INNER JOIN (  
      SELECT ix.[name] AS [Index name], SUM(sz.[used_page_count]) * 8 AS [Index size (KB)]  
      FROM sys.dm_db_partition_stats AS sz  
      INNER JOIN sys.indexes AS ix ON sz.[object_id] = ix.[object_id] AND sz.[index_id] = ix.[index_id]  
    GROUP BY ix.[name]  
  ) AS index_size_stats ON index_op_stats.Index_name = index_size_stats.[Index name]  
WHERE user_updates > 0
```

**Gotchas: ** This query only tells you usage statistics of the current database without accounting for any slave/replica usage statistics.

## Unused Indexes in a master-slave SQL server

In a master-slave SQL server setup, just considering unused indexes of master and deleting them right away would be a bummer. As you might need a particular index for slave and slave index, statistics will differ according to your usage pattern.
So, in such setups, we would:
* Find useful indexes in slave.
* Find unused indexes in master, excluding useful indexes of the slave.

```sql
-- First query: Finding useful indexes on slave
-- Note: Run this query on slave db.

SELECT indexes.name AS Index_name
FROM sys.dm_db_index_usage_stats  
         INNER JOIN sys.objects ON dm_db_index_usage_stats.OBJECT_ID = objects.OBJECT_ID  
  INNER JOIN sys.indexes ON indexes.index_id = dm_db_index_usage_stats.index_id AND  
  dm_db_index_usage_stats.OBJECT_ID = indexes.OBJECT_ID  
WHERE indexes.is_primary_key = 0 --This line excludes primary key constarint  
  AND indexes.is_unique = 0 --This line excludes unique key constarint  
  AND indexes.type = 2  
GROUP BY indexes.name, objects.name  
HAVING SUM(dm_db_index_usage_stats.user_seeks) + SUM(dm_db_index_usage_stats.user_scans) +  
       SUM(dm_db_index_usage_stats.user_lookups) > 0
```

Copy the list of indexes and add it as a `NOT IN` clause for the second query.

```sql
-- Second query: Finding unused indexes on the master, which are also unused in slave.
-- Note: Run this query on master

SELECT *  
FROM (  
         SELECT objects.name AS Table_name,  
  indexes.name AS Index_name,  
  SUM(dm_db_index_usage_stats.user_seeks)   as user_seeks,  
  SUM(dm_db_index_usage_stats.user_scans)   as user_scans,  
  SUM(dm_db_index_usage_stats.user_lookups) as user_lookups,  
  SUM(dm_db_index_usage_stats.user_updates) as user_updates  
         FROM sys.dm_db_index_usage_stats  
                  INNER JOIN sys.objects ON dm_db_index_usage_stats.OBJECT_ID = objects.OBJECT_ID  
  INNER JOIN sys.indexes ON indexes.index_id = dm_db_index_usage_stats.index_id AND  
  dm_db_index_usage_stats.OBJECT_ID = indexes.OBJECT_ID  
  WHERE indexes.is_primary_key = 0 --This line excludes primary key constarint  
  AND indexes.is_unique = 0 --This line excludes unique key constarint  
  AND indexes.type = 2  
  GROUP BY indexes.name, objects.name  
  HAVING SUM(dm_db_index_usage_stats.user_seeks) + SUM(dm_db_index_usage_stats.user_scans) +  
                SUM(dm_db_index_usage_stats.user_lookups) <= 0  
  AND SUM(dm_db_index_usage_stats.user_updates) <> 0  
  ) AS index_op_stats  
         INNER JOIN (  
    SELECT ix.[name] AS [Index name], SUM(sz.[used_page_count]) * 8 AS [Index size (KB)]  
    FROM sys.dm_db_partition_stats AS sz  
             INNER JOIN sys.indexes AS ix ON sz.[object_id] = ix.[object_id] AND sz.[index_id] = ix.[index_id]  
  GROUP BY ix.[name]  
) AS index_size_stats ON index_op_stats.Index_name = index_size_stats.[Index name]  
WHERE Index_name NOT IN (
  -- Add list of indexes from slave here
  'slave-index-1', 'sol_seller_order_id_index', 'task_id_idx', 'slave-index-2'  
)
```
This should give you a list of indexes that we can safely delete.

## Closing notes
The analysis is only a tiny part of the *unused index deletion operation*. 
Execution, a.k.a. actually dropping indexes, can be just as challenging if not more. So, before you go ahead and drop the indexes without any safety mechanisms in check, you might want to read [Part-2](/sql-server-dropping-indexes-in-production-env/) where we'll discuss gotchas and blocking issues that can occur due to index deletion in production.
