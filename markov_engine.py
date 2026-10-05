# markov_engine.py
# Markov chain recommender for a small bookstore.
# Idea: books bought together in the same receipt are "connected".
# We turn those connections into a transition matrix P and treat
# recommending like a random walk from the book the customer picked.

import json
import numpy as np


def load_data(path):
    # read the books + receipts from the json file
    with open(path, "r") as f:
        data = json.load(f)
    return data["books"], data["transactions"]


def build_cooccurrence(transactions, book_list):
    """co_matrix[i][j] = how many receipts had book i AND book j together"""
    n = len(book_list)

    # map book_id -> row/col number in the matrix
    index_of = {}
    for i in range(n):
        index_of[book_list[i]["book_id"]] = i

    co_matrix = np.zeros((n, n))

    for t in transactions:
        ids = []
        for item in t["items"]:
            ids.append(item["book_id"])

        # go through every pair in this receipt (both directions)
        for a in range(len(ids)):
            for b in range(len(ids)):
                if a == b:
                    continue  # a book is not paired with itself
                i = index_of[ids[a]]
                j = index_of[ids[b]]
                co_matrix[i][j] += 1

    return co_matrix, index_of


def make_stochastic(co_matrix):
    """normalize rows to make it stochastic (every row adds up to 1)"""
    n = co_matrix.shape[0]
    trans_matrix = np.zeros((n, n))

    for i in range(n):
        row_sum = co_matrix[i].sum()
        if row_sum == 0:
            # TODO: double check edge cases when row sum is 0
            # book never bought with anything else, so just say every
            # book is equally likely next (otherwise we divide by zero)
            for j in range(n):
                trans_matrix[i][j] = 1.0 / n
        else:
            for j in range(n):
                trans_matrix[i][j] = co_matrix[i][j] / row_sum

    return trans_matrix


def power_iteration(trans_matrix, max_iter=1000, tol=1e-10):
    """
    Finds the stationary distribution pi where pi P = pi.
    Start with every book equally likely, then keep multiplying by P
    until the vector stops changing.
    """
    n = trans_matrix.shape[0]
    pi = np.ones(n) / n  # start uniform

    for step in range(max_iter):
        new_pi = pi @ trans_matrix  # row vector times matrix
        diff = np.abs(new_pi - pi).sum()
        pi = new_pi
        if diff < tol:
            break
    # NOTE: this only converges nicely if the graph is connected and not
    # periodic. Works for our mock data, might not for a really tiny store.

    return pi


def random_walk_restart(trans_matrix, start_vec, restart_prob=0.15,
                        max_iter=1000, tol=1e-10):
    """
    Random walk with restart. At each step, with prob restart_prob we jump
    back to the start book(s), otherwise we follow P like normal.
    p_new = c * start + (1 - c) * (p P)
    """
    p = start_vec.copy()

    for step in range(max_iter):
        p_new = restart_prob * start_vec + (1 - restart_prob) * (p @ trans_matrix)
        diff = np.abs(p_new - p).sum()
        p = p_new
        if diff < tol:
            break

    return p


def get_hubs(pi, book_list, top_n=5):
    """top books by stationary probability = the 'hub' books"""
    order = np.argsort(pi)[::-1]  # biggest first
    hubs = []
    for k in range(top_n):
        i = order[k]
        hubs.append({
            "title": book_list[i]["title"],
            "genre": book_list[i]["genre"],
            "score": round(float(pi[i]), 4),
        })
    return hubs


def get_genres(book_list):
    genres = []
    for book in book_list:
        if book["genre"] not in genres:
            genres.append(book["genre"])
    genres.sort()
    return genres


def _top_books(prob_scores, book_list, skip_indexes, top_n):
    # helper: pick the top_n highest scores, ignoring some books
    order = np.argsort(prob_scores)[::-1]
    results = []
    for i in order:
        if i in skip_indexes:
            continue
        results.append({
            "title": book_list[i]["title"],
            "genre": book_list[i]["genre"],
            "score": round(float(prob_scores[i]), 4),
        })
        if len(results) == top_n:
            break
    return results


def recommend_for_book(trans_matrix, book_list, index_of, current_book,
                       method="rwr", top_n=3):
    """current_book is a book_id like 'B01'. method is 'rwr' or 'step'."""
    n = len(book_list)
    start_idx = index_of[current_book]

    start_vec = np.zeros(n)
    start_vec[start_idx] = 1.0

    if method == "step":
        # single step lookup = just row i of P
        prob_scores = trans_matrix[start_idx]
    else:
        prob_scores = random_walk_restart(trans_matrix, start_vec)

    # don't recommend the same book they already picked
    return _top_books(prob_scores, book_list, [start_idx], top_n)


def recommend_for_genre(trans_matrix, book_list, genre, method="rwr", top_n=3):
    """same idea but we start from ALL the books in a genre (equal weight)"""
    n = len(book_list)

    start_vec = np.zeros(n)
    count = 0
    for i in range(n):
        if book_list[i]["genre"] == genre:
            start_vec[i] = 1.0
            count += 1

    if count == 0:
        return []  # genre not found
    start_vec = start_vec / count  # make it a probability vector

    if method == "step":
        prob_scores = start_vec @ trans_matrix
    else:
        prob_scores = random_walk_restart(trans_matrix, start_vec)

    # here we keep books from the same genre too, since the customer
    # picked a genre and not one specific book
    return _top_books(prob_scores, book_list, [], top_n)
