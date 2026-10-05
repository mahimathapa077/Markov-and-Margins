// script.js
// sends the choice to the flask api and shows the results without reloading

var bookField = document.getElementById("book-field");
var genreField = document.getElementById("genre-field");
var bookSearch = document.getElementById("book-search");
var bookOptions = document.getElementById("book-options").options;
var genreSelect = document.getElementById("genre-select");
var recommendBtn = document.getElementById("recommend-btn");
var statusText = document.getElementById("status");
var resultsList = document.getElementById("results-list");

// helper to get which radio button is picked
function getRadioValue(name) {
  var radios = document.getElementsByName(name);
  for (var i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      return radios[i].value;
    }
  }
  return null;
}

// show the book box or the genre dropdown
function updateFields() {
  if (getRadioValue("pick_type") === "book") {
    bookField.style.display = "block";
    genreField.style.display = "none";
  } else {
    bookField.style.display = "none";
    genreField.style.display = "block";
  }
}

var typeRadios = document.getElementsByName("pick_type");
for (var i = 0; i < typeRadios.length; i++) {
  typeRadios[i].addEventListener("change", updateFields);
}

// when you click the box, select the old text so typing replaces it
bookSearch.addEventListener("focus", function () {
  bookSearch.select();
});

// turn whatever is typed in the box into a book_id
function findBookId() {
  var typed = bookSearch.value.toLowerCase().trim();
  if (typed === "") {
    return null;
  }

  var matches = [];
  for (var i = 0; i < bookOptions.length; i++) {
    var title = bookOptions[i].value.toLowerCase();
    if (title === typed) {
      return bookOptions[i].getAttribute("data-id");  // exact match
    }
    if (title.indexOf(typed) !== -1) {
      matches.push(bookOptions[i]);
    }
  }

  // if only one book contains the typed text, use that one
  if (matches.length === 1) {
    return matches[0].getAttribute("data-id");
  }
  return null;
}

function showResults(data) {
  resultsList.innerHTML = "";

  if (data.recommendations.length === 0) {
    statusText.textContent = "No recommendations found.";
    return;
  }

  var methodName = data.method === "step" ? "direct matches" : "wider connections";
  statusText.textContent = "If they like " + data.input + " (" + methodName + "):";

  for (var i = 0; i < data.recommendations.length; i++) {
    var rec = data.recommendations[i];

    var li = document.createElement("li");
    li.textContent = rec.title;

    var tag = document.createElement("span");
    tag.className = "genre-tag";
    tag.textContent = rec.genre;
    li.appendChild(tag);

    resultsList.appendChild(li);
  }
}

function getRecommendations() {
  var pickType = getRadioValue("pick_type");
  var method = getRadioValue("method");
  var value;

  if (pickType === "book") {
    value = findBookId();
    if (value === null) {
      resultsList.innerHTML = "";
      statusText.textContent = "Please pick a book from the list (start typing, then click a suggestion).";
      return;
    }
  } else {
    value = genreSelect.value;
  }

  statusText.textContent = "Thinking...";
  resultsList.innerHTML = "";

  fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: pickType, value: value, method: method })
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (data.error) {
        statusText.textContent = "Error: " + data.error;
      } else {
        showResults(data);
      }
    })
    .catch(function (err) {
      console.log(err);
      statusText.textContent = "Something went wrong, is the server running?";
    });
}

recommendBtn.addEventListener("click", getRecommendations);

// pressing Enter in the book box = clicking Recommend
bookSearch.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    getRecommendations();
  }
});
