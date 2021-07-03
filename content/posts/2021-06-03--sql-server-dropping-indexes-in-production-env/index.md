---
title: "SQL Server: Dropping Indexes in production (safely)"
subTitle: Detect and work around deadlocks 
cover: sql.png
category: ["databases"]
---

We analyzed and compiled a list of unused indexes in our SQL database in [Part one](/sql-server-unused-indexes) of removing unused indexes from SQL server. 

So, let's just run the `DROP INDEX` query and be done with it. Right?

```sql
DROP INDEX index_1 ON table_1;
```
Stop!!!!!

If you were doing this on your test instance, go ahead, nobody gives a damn anyways.

If you want to do it in production with 1000s of queries hitting the database every second, straightaway dropping indexes without being aware of implications doesn't seem like a good idea.
So, what could go wrong? Let's look a bit deeper.

## Under the hood of dropping an index

`DROP INDEX` operation is a locking operation and requires an exclusive lock to be held for the duration. If it locks the table for more than a few seconds, it might result in blocking other DML/DQL queries essential for your application.

But the `DROP INDEX` operation is relatively quick and typically finishes within a few milliseconds regardless of the index size. 
What could go wrong if it takes a few milliseconds?
I thought so too, and it ended up choking the database with DML queries piled up in large numbers. Below is the result of my RCA and research after a similar operation caused system degradation in our services.

The short answer is blocking queries and deadlock, which can occur as a result of it.

Let's understand this in a bit more detail:
To drop an index, the SQL server has to take a **(Sch-M) lock**. Sch-M(Schema Modification) refers to a kind of lock taken on a table, index, or another object whenever you want to modify that object. So, your operation has to wait to take this lock if some other process is holding it since it is exclusive in nature.
Not only that, for it to be able to acquire this lock, it also has to make sure if any other process holds a **(Sch-S) lock** .
These **(Sch-S) locks**  are prerequisites for DML operations. An Sch-S lock is placed on the metadata at the start of any DML operation. This lock ensures the stability of the schema on which it operates, i.e., it remains the same throughout the operation. So, multiple DML queries can hold this lock simultaneously since it doesn't actually change anything but ensure that it doesn't. But DDL queries do change the schema, and therefore it creates conflicts. **(Sch-S)** and **(Sch-M)** are not compatible and block each other.

Adding to that, DML requires **IX lock**(Intent Exclusive lock)  on the table. And one query may have certain locks as `GRANT` status and other locks as `WAIT` status. This means it will keep holding the locks it has until it gets all the locks required to perform the operation. If a lock is held by a DDL query that is incompatible with **IX** lock, and the DDL query is waiting for the **IX** lock to be released, it will cause deadlock. 
It can't move forward without one of the queries backing out on these requests or getting killed. Moreover, as the system receives more and more requests which can't be resolved due to the lock state as `WAITING`. The number of active queries will keep increasing, and latencies will keep shooting until locks are forcefully removed.

In certain scenarios, it is a good idea to look at blocking process hierarchy and locks held by each process to figure out what processes are waiting to acquire what type of lock on which resource.

```sql
-- Find blocking tree of queries
SET NOCOUNT ON  
GO  
SELECT SPID, BLOCKED, REPLACE (REPLACE (T.TEXT, CHAR(10), ' '), CHAR (13), ' ' ) AS BATCH  
INTO #T  
FROM sys.sysprocesses R CROSS APPLY sys.dm_exec_sql_text(R.SQL_HANDLE) T  
GO  
WITH BLOCKERS (SPID, BLOCKED, LEVEL, BATCH) AS (  
  SELECT SPID,  
  BLOCKED,  
  CAST (REPLICATE ('0', 4-LEN (CAST (SPID AS VARCHAR))) + CAST (SPID AS VARCHAR) AS VARCHAR (1000)) AS LEVEL,  
  BATCH FROM #T R  
  WHERE (BLOCKED = 0 OR BLOCKED = SPID)  
               AND EXISTS (SELECT * FROM #T R2 WHERE R2.BLOCKED = R.SPID AND R2.BLOCKED <> R2.SPID)  
  UNION ALL  
 SELECT R.SPID, R.BLOCKED,  
  CAST (BLOCKERS.LEVEL + RIGHT (CAST ((1000 + R.SPID) AS VARCHAR (100)), 4) AS VARCHAR (1000)) AS LEVEL, R.BATCH FROM #T AS R  
 INNER JOIN BLOCKERS ON R.BLOCKED = BLOCKERS.SPID WHERE R.BLOCKED > 0 AND R.BLOCKED <> R.SPID  
)  
SELECT N'    ' + REPLICATE (N'|         ', LEN (LEVEL)/4 - 1) +  
       CASE WHEN (LEN(LEVEL)/4 - 1) = 0  
  THEN 'HEAD -  '  
  ELSE '|------  ' END  
  + CAST (SPID AS NVARCHAR (10)) + N' ' + BATCH AS BLOCKING_TREE  
FROM BLOCKERS ORDER BY LEVEL ASC  
GO  
DROP TABLE #T  
GO
```

Also, it is a good idea to look at currently active long-running queries.

```sql
-- Active queries on SQL server
SELECT sid = er.session_id,  
 status = ses.status,  
  [user] = ses.login_name,  
  host = ses.host_name,  
  program = ses.program_name,  
  blkBy = er.blocking_session_id,  
  dbName = Db_name(er.database_id),  
  commandType = er.command,  
  objectName  = Object_name(st.objectid),  
  cpuTime = er.cpu_time,  
  startTime = er.start_time,  
  timeElapsed = Cast(Getdate() - er.start_time AS TIME),  
  statement = st.text  
FROM sys.dm_exec_requests er  
           OUTER apply sys.Dm_exec_sql_text(er.sql_handle) st  
           LEFT JOIN sys.dm_exec_sessions ses  
                     ON ses.session_id = er.session_id  
  LEFT JOIN sys.dm_exec_connections con  
                     ON con.session_id = ses.session_id  
WHERE st.text IS NOT NULL  
order by startTime
```

Now, if there are long-running queries and your `DROP INDEX` query is blocked by any such query. You should kill the query/session to avoid queries piling up. 

Typically I kill the drop index session within a few seconds if it doesn't finish. 

## Closing notes
Dropping index, although it seems easy but can issue on production workloads. It should be done at a quieter time for fewer hassles. 
In most cases, it will just acquire the necessary lock, delete and release lock - all within milliseconds. But, it is better to remain cautious for those 1% cases where this might not be that straightforward.

