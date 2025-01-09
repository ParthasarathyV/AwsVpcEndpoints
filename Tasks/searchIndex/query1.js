[
  {
    "$search": {
      "index": "filter_index",
      "compound": {
        "must": [
          {
            "regex": {
              "query": "CT",
              "path": "title",
              "allowAnalyzedField": true,
              "options": "i" // Case-insensitive
            }
          },
          {
            "term": {
              "query": "AMBER",
              "path": "rag"
            }
          },
          {
            "term": {
              "query": "In Progress",
              "path": "executionState"
            }
          },
          {
            "regex": {
              "query": "Pay",
              "path": "productName",
              "allowAnalyzedField": true,
              "options": "i" // Case-insensitive
            }
          }
        ]
      }
    }
  },
  {
    "$skip": 0
  },
  {
    "$limit": 100
  }
]
