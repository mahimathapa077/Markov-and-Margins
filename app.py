# app.py
# Flask server for the bookstore recommender
# run with: python app.py

import os
from flask import Flask, render_template, request, jsonify
import markov_engine

app = Flask(__name__)

# build everything once when the server starts
base_folder = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(base_folder, "data", "transactions.json")

book_list, transactions = markov_engine.load_data(data_path)
co_matrix, index_of = markov_engine.build_cooccurrence(transactions, book_list)
trans_matrix = markov_engine.make_stochastic(co_matrix)
pi = markov_engine.power_iteration(trans_matrix)
hub_books = markov_engine.get_hubs(pi, book_list, top_n=5)
genre_list = markov_engine.get_genres(book_list)


@app.route('/')
def index():
    return render_template("index.html",
                           books=book_list,
                           genres=genre_list,
                           hubs=hub_books)


@app.route('/api/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    if data is None:
        return jsonify({"error": "no data sent"}), 400

    pick_type = data.get("type")      # "book" or "genre"
    value = data.get("value")         # a book_id or a genre name
    method = data.get("method", "rwr")

    if method not in ("rwr", "step"):
        method = "rwr"

    if pick_type == "book":
        if value not in index_of:
            return jsonify({"error": "book not found"}), 400
        recs = markov_engine.recommend_for_book(
            trans_matrix, book_list, index_of, value, method)
        label = book_list[index_of[value]]["title"]

    elif pick_type == "genre":
        if value not in genre_list:
            return jsonify({"error": "genre not found"}), 400
        recs = markov_engine.recommend_for_genre(
            trans_matrix, book_list, value, method)
        label = value

    else:
        return jsonify({"error": "type must be book or genre"}), 400

    return jsonify({"input": label, "method": method, "recommendations": recs})


if __name__ == '__main__':
    app.run(debug=True)
