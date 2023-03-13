---
title: "Dancing with heuristic algorithms"
subTitle: An Algorithmic Journey to Maximizing Rest Time for Performers
cover: cover.png
category: ["computer science"]
---

Who said computational algorithms can only be used at work, algorithms can save lives - or at the very least save you a couple of paracetamol tabs and a huge ton of time. 

And now, give me a fair chance to explain. 

## The problem

For our annual dance showcase, I am tasked with designing a show flow consisting of 20 performances and about 80 performers. Sounds easy? It won’t if I were to tell you that each performer is part of about 2-3 performances on average. In fact, some are even part of 7 or more performances.

Dance, even more so contemporary as a form, is physically very demanding. It's therefore important for the performers to have enough time to rest and change costumes between performances. We wanted to make sure that the performances were spaced out enough, so the dancers will have time to recover and prepare for their next performance.

## Amateur attempts

The obvious way to get this going was to intuitively come up with an order and try to fix it by rearranging it - until it looks good. That’s what we did and sent it to a couple of performers as a draft show flow.

They were not happy (of course).

There was no substantial gap between performances for these people in places. And after countless iterations, dozens of text exchanges and 3 paracetamol tablets later, it got us thinking “there has to be a simpler and better way!”

”Only if there was an algorithm for this” - I hopelessly said to myself.

![](./heuristic-meme.jpeg)

So I googled and googled, but there wasn’t, or at least couldn’t find one after rephrasing the problem a dozen times. 

I realized that the computer scientist in me had to rise to the occasion to have any chance at solving this.

I figured that it is an optimal sequencing or an optimization problem that does follow any obvious pattern. The brute-force way to solve this would be to evaluate every possible sequence and pick the best one. If we’re talking about n performances, we need to evaluate n! sequences to come to a solution. It's like trying to solve a Rubik's cube while blindfolded and quickly realizing that it is an **NP-complete** problem.

While googling out potential ways to solve NP-complete optimization problems, I came across this interesting class of algorithms called “Heuristic and metaheuristic algorithms”. So I read and read and got lost in this world. Kind of like Alice in Wonderland, but with heuristic algorithms.

## Finding the cure - Heuristic algorithms

In the world of computer science, there’s a plethora of algorithms that are used to solve optimization problems. Some of these algorithms are exact, which means they always find the optimal solution, but they can be very slow for large problems. Other algorithms are heuristic or metaheuristic, which means they may not find the optimal solution, but they can find a very good solution in a reasonable amount of time. One such class of heuristic algorithms is the local search algorithms.

### Local Search Heuristic Algorithms

Local search algorithms start with an initial solution and try to improve it by making small changes to it. They do not try to explore all possible solutions but instead focus on the solutions that are nearby in some sense. These algorithms can be very effective for certain types of problems, such as scheduling problems, where it is difficult to find the optimal solution, but a good solution can still be beneficial.

`Choose a candidate solution S at random.`

`Initialise S-best = S`

`repeat for maxIterations or till a termination condition is met:`

- `Apply a set of operations to alter the solution S, forming S’. 
Note: Add randomness to improve the avg running time.`
- `Evaluate the effectiveness of S’ using a function Effectiveness(S')`
- `If the Effectiveness(S') > Effectiveness(S-best)`
    - `S-best = S'`

`Return S-best`

This outline of such metaheuristic algorithms is often generic, so the same outline can be used to solve a wide variety of problems by varying the effectiveness function. 

### So what are we looking for in a solution?

Let’s define what we want in a solution more concretely. The key to making this algorithm work is to have a good way of evaluating whether a new order is better than the current best order. We need to define `best` formally such that it can be computed, evaluated, and compared for each iteration.

Formally, we want to maximize the `minimum rest times between performances` for all performers in a balanced manner. 

What is `balanced` here, you may ask:

```jsx

performerA: [P1, P2]
performerB: [P3, P4]
// The order [P1, P3, P4, P2] maximizes the rest time for performerA 
// But comes at a cost of reducing the rest time for performerB.
```

Maximizing the minimum rest times for a performer should not be done at cost of minimizing the minimum rest times for other performers. 

```python
def min_rest_time(performer, order):
    selected_performers_performances = performers[performer]
    order_for_selected_performer = list(sorted(map(lambda p: order.index(p), selected_performers_performances)))
    # return the minimum difference between two consecutive performances
    return min([b-a for a, b in zip(order_for_selected_performer[:-1], order_for_selected_performer[1:])])
```

Our overall effectiveness is bottlenecked on the performer with minimum rest between any of their two performances. To start off with, we’ll make sure that we look at the performer with minimum rest between performances and maximize that iteratively. Slowly I figured that I can add more tie-breaker criteria to further optimize the effectiveness of the algorithm.

We have 3 criteria to compare two given orders:

- First, we want to maximize the minimum rest time for each performer. (Main criteria)
- Second, in case the minimum rest time amongst two given orders is the same, we want to minimize the count of performers having that minimum rest time. (Tie-breaker 1)
- Finally, in case the minimum rest time and the performer count of minimum rest time are the same, we want to maximize the accumulated rest time for each performer. (Tie-breaker 2)

We can probably come up with more criteria or rearrange the existing ones depending on what we value most in the resultant order.

```python
def has_rest_times_improved(old_rest_times, new_rest_times):
    # Criteria 1: Maximize the minimum time
    min_rest_time_old = min(old_rest_times)
    min_rest_time_new = min(new_rest_times)
    if min_rest_time_new != min_rest_time_old:
      return min_rest_time_old < min_rest_time_new

    # Criteria 2: In case minimum rest time is same, minimize the count of minimum rest time
    min_count_freq_old = old_rest_times.count(min_rest_time_old)
    min_count_freq_new = new_rest_times.count(min_rest_time_new)
    if min_count_freq_new != min_count_freq_old:
      return min_count_freq_old > min_count_freq_new
    
    # Criteria 3: In case minlimum rest and frequency is same, maximize the accumulated rest time
    return sum(old_rest_times) < sum(new_rest_times)
```

## Piecing it together

Having all the pieces of the puzzle together, let’s stitch it together to a working solution. 

**Code:**

```python
import random

# Define the list of performances and performers
performances = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19', 'P20']
performers = {'Lokesh': ['P1', 'P2', 'P3'], 'Aastha': ['P7', 'P8', 'P9'], 'Anand': ['P1', 'P5', 'P10', 'P11'], 'Ananya': ['P12', 'P13', 'P14'], 'Arathi': ['P15', 'P16', 'P17'], 'Purvi': ['P2', 'P4', 'P18', 'P19'], 'Suraj': ['P10', 'P11', 'P20'], 'Shradha': ['P3', 'P6', 'P9', 'P17', 'P20'], 'Lily': ['P13', 'P14', 'P18', 'P19']}

def min_rest_time(performer, order):
    selected_performers_performances = performers[performer]

    order_for_selected_performer = list(sorted(map(lambda p: order.index(p), selected_performers_performances)))
    # return the minimum difference between two consecutive performances
    return min([b-a for a, b in zip(order_for_selected_performer[:-1], order_for_selected_performer[1:])])

def min_rest_times_for_all_performers(order):
  rest = {}
  for performer in performers:
    rest[performer] = min_rest_time(performer, order)
  return rest

def has_rest_times_improved(old_rest_times, new_rest_times):
    # Criteria 1: Maximize the minimum time
    min_rest_time_old = min(old_rest_times)
    min_rest_time_new = min(new_rest_times)
    if min_rest_time_new != min_rest_time_old:
      return min_rest_time_old < min_rest_time_new

    # Criteria 2: In case minimum rest time is same, minimize the count of minimum rest time
    min_count_freq_old = old_rest_times.count(min_rest_time_old)
    min_count_freq_new = new_rest_times.count(min_rest_time_new)
    if min_count_freq_new != min_count_freq_old:
      return min_count_freq_old > min_count_freq_new
    
    # Criteria 3: In case minimum rest and frequency is same, maximize the accumulated rest time
    return sum(old_rest_times) < sum(new_rest_times)

def compute(max_iterations = 100000):
  # Generate an initial order of performances
  order = performances.copy()
  random.shuffle(order)
  best_order_so_far = order.copy()

  # Evaluate the rest time of each performer based on the initial order
  rest = min_rest_times_for_all_performers(order)

  # Iteratively improve the order by swapping adjacent performances
  for i in range(max_iterations):

      # Generate a random pair of adjacent performances to swap
      a = random.randint(0, len(order) - 2)
      b = a + 1
      order[a], order[b] = order[b], order[a]
      
      # Evaluate the rest time of each performer based on the new order
      new_rest = min_rest_times_for_all_performers(order)

      if has_rest_times_improved(list(rest.values()), list(new_rest.values())):
          rest = new_rest.copy()
          best_order_so_far = order.copy()
          print("Found an improved order. New rest times: ", rest)
  
  return best_order_so_far
    

order = compute(max_iterations = 100000)
rest = min_rest_times_for_all_performers(order)
# Print the final order and rest time for each performer
print('Final order:', order)
print('Performer list with min rest times and sequence order:')
for performer in performers:
    sequence_list_for_performer = sorted(list(map(lambda pId: order.index(pId) + 1, performers[performer])))
    print(performer, ':', rest[performer], ':', sequence_list_for_performer)
```

It took a couple of iterations to refine `has_rest_times_improved` and make it spit out a great solution. 

One crucial thing to note about such heuristic algorithms is - You can increase the `max_iterations` parameter to move towards a more optimal solution. However, it will increase the running time proportionally. 

**Final output:**

```
Final order: ['P6', 'P1', 'P13', 'P20', 'P2', 'P16', 'P14', 'P8', 'P4', 'P15', 'P7', 'P5', 'P3', 'P18', 'P10', 'P9', 'P12', 'P19', 'P11', 'P17']

Performer list with min rest times and sequence order:
Lokesh : 3 : [2, 5, 13]
Aastha : 3 : [8, 11, 16]
Anand : 3 : [2, 12, 15, 19]
Ananya : 4 : [3, 7, 17]
Arathi : 4 : [6, 10, 20]
Purvi : 4 : [5, 9, 14, 18]
Suraj : 4 : [4, 15, 19]
Shradha : 3 : [1, 4, 13, 16, 20]
Lily : 4 : [3, 7, 14, 18]
```

And voila! That is how you do it. The joy of solving real-life problems by leveraging your academic background is unmatched. I slept great that night. 

## So, Where do we go from here?

The good thing about heuristic algorithms is that you can make modifications to the scoring/comparison criteria of result sets basis the goals and results will reflect it without making changes to the rest of the code.

Suppose we wanted to consider the duration of performance instead of assuming all performances are of equal duration. We can just change the `min_rest_time(performer, order)` method to include duration as part of the rest time calculation.

```python
# duration(in seconds) for each performance
duration = {'P1': 90, 'P2': 60, 'P3': 120, 'P4': 200, 'P5': 40, 'P6': 80, 'P7': 90, 'P8': 90, 'P9': 90, 'P10': 70, 'P11': 90, 'P12': 90, 'P13': 120, 'P14': 80, 'P15': 100, 'P16': 90, 'P17': 90, 'P18': 90, 'P19': 90, 'P20': 180}
def compute_accumulated_duration_for_order(order):
    accumulated_duration_till_index = {}
    duration_so_far = 0
    for performance in order:
        accumulated_duration_till_index[performance] = duration_so_far
        duration_so_far += duration[performance]
    return accumulated_duration_till_index

def min_rest_time(performer, order):
    selected_performers_performances = performers[performer]
    accumulated_duration_till_perf = compute_accumulated_duration_for_order(order)

    order_for_selected_performer = list(sorted(map(lambda p: accumulated_duration_till_perf[p], selected_performers_performances)))
    # return the minimum difference between two consecutive performances
    return min([b-a for a, b in zip(order_for_selected_performer[:-1], order_for_selected_performer[1:])])
```

In terms of optimization, you can figure out avenues of repeated computation and avoid it to save on CPU time and the overall runtime of the algorithm.

Another trick up our sleeve is parallelism. By dividing up the computation into multiple threads, we can tackle the problem faster and more efficiently by a factor of `num_cpus`.

## Closing thoughts

Algorithms and computer science in general give you an extraordinary ability to look at problems from a different lens. What’s not so common is - activating this lens for solving problems outside of a software engineering job. This blog post was just an example of how you can utilize the computer science knowledge that you acquired coupled with the extraordinary speed of computers to solve real-life problems.

Heuristic algorithms in general can be utilized to solve a wide variety of problems. I had previously built a 15-puzzle game along with an AI solver that attempts to solve it using A* algorithm. You can find it here. ([Code](https://github.com/lokeshdevnani/15-puzzle-ai) / **[Demo](https://number-puzzle.surge.sh/)**)

*Thank you for reading. Drop a comment if you recently solved a daily life problem using computer science.*

*Special thanks to [@ananya](https://www.instagram.com/onion_glorified/), and [@electron0zero](https://twitter.com/electron0zero) for feedback and suggestions.*