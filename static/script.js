// script.js
// sends the choice to the flask api and shows the results without reloading

var bookField = document.getElementById("book-field");
var genreField = document.getElementById("genre-field");
var bookSelect = document.getElementById("book-select");
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

// show the book dropdown or the genre dropdown
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

    var score = document.createElement("span");
    score.className = "score";
    score.textContent = "probability score: " + rec.score;
    li.appendChild(score);

    resultsList.appendChild(li);
  }
}

recommendBtn.addEventListener("click", function () {
  var pickType = getRadioValue("pick_type");
  var method = getRadioValue("method");
  var value;

  if (pickType === "book") {
    value = bookSelect.value;
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
});


    // ---- search box: type to filter the book list ----
    var bookSearch = document.getElementById("book-search");

    // remember the full list of books once, when the page loads
    var allBooks = [];
    for (var k = 0; k < bookSelect.options.length; k++) {
      allBooks.push({ value: bookSelect.options[k].value, text: bookSelect.options[k].text });
    }

    function filterBooks() {
      var typed = bookSearch.value.toLowerCase().trim();
      bookSelect.innerHTML = "";
      var count = 0;

      for (var j = 0; j < allBooks.length; j++) {
        if (allBooks[j].text.toLowerCase().indexOf(typed) !== -1) {
          var opt = document.createElement("option");
          opt.value = allBooks[j].value;
          opt.textContent = allBooks[j].text;
          bookSelect.appendChild(opt);
          count++;
        }
      }

      if (count === 0) {
        var none = document.createElement("option");
        none.value = "";
        none.textContent = "No matching books";
        bookSelect.appendChild(none);
      }

      // show a few rows while typing so the matches are visible
      if (typed !== "" && count > 1) {
        bookSelect.size = Math.min(count, 6);
      } else {
        bookSelect.size = 1;
      }

      bookSelect.selectedIndex = 0;  // pick the first match automatically
    }

    bookSearch.addEventListener("input", filterBooks);

    // pressing Enter in the search box = clicking Recommend
    bookSearch.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        recommendBtn.click();
      }
    });