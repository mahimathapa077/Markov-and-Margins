# Next Chapter - Markov Chain Book Recommender

A small web tool for independent bookstores. It reads old point-of-sale receipts and predicts which book a customer is likely to want next, using a Markov chain built from a matrix. No big datasets or machine learning libraries needed, which matters because a small shop doesn't have much data.

## How to run

```
pip install flask numpy
python app.py
```

Then open http://127.0.0.1:5000 in your browser.

## Project layout

```
app.py              Flask routes
markov_engine.py    all the math (matrix, power iteration, random walk)
data/transactions.json   mock receipts (18 receipts, 13 books, 5 genres)
templates/index.html
static/style.css
static/script.js
```

## The math (short version)

1. **Co-occurrence matrix C.** `C[i][j]` is the number of receipts where book i and book j were bought together.

2. **Transition matrix P.** Divide each row by its sum so every row adds up to 1:

   `P[i][j] = C[i][j] / (sum of row i)`

   Now `P[i][j]` is the probability of "moving" from book i to book j. Every row is a probability distribution, so P is a row-stochastic matrix. If a book has a row sum of 0, I just make that row uniform so there is no division by zero.

3. **Stationary distribution (hub books).** We want a vector pi with

   `pi P = pi`

   Power iteration: start with pi equal for all books, and keep replacing it with `pi P` until it stops changing. The books with the largest values in pi are the "hubs", the ones that are most connected to the rest of the store's catalog. (This converges when the chain is connected and aperiodic, which holds for the mock data.)

4. **Recommendations.** Two options in the app:
   - *Single step:* take row i of P and show the 3 biggest entries (excluding the book itself).
   - *Random walk with restart:* repeatedly compute `p = c * e + (1 - c) * p P`, where e is the start vector (the chosen book, or all books of a chosen genre with equal weight) and c = 0.15 is the restart probability. This also finds books that are two or three hops away, not just direct neighbours.

## Limitations / ideas for later

- The mock data is tiny and made up, so the results are just a demo.
- Only receipts with 2+ books give any information.
- Could add time ordering (the real "reading trajectory") by using the timestamps of a returning customer's purchases instead of one receipt.
