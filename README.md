# CodeAlpha_Chatbot_for_FAQs
This project is essentially building a smart retrieval system. Unlike a simple search that looks for exact word matches, an NLP-powered chatbot understands the intent and context behind a user's question to provide the most relevant answer from a pre-defined list.


# 📦 Amazon FAQ AI Chatbot
A professional, full-stack NLP application designed to provide instant support for Amazon product queries. This project implements **Natural Language Processing (NLP)** to map user inquiries to a large-scale FAQ dataset with high precision.

---

## 🚀 Features
*   **Intelligent Text Processing:** Utilizes `NLTK` for advanced tokenization, stop-word removal, and lemmatization.
*   **Semantic Matching:** Implements `TF-IDF Vectorization` and `Cosine Similarity` to understand user intent beyond simple keyword matching.
*   **Persistent Logic:** Optimized backend using `Pickle` for model persistence, ensuring rapid response times without recalculating the dataset on every request.
*   **Modern UI:** A responsive "Glassmorphism" dark-mode interface built with Flask, HTML5, and CSS3.
*   **Optimized History:** Cleaned Git repository history using advanced reset techniques for professional-grade repository management.

---

## 🛠️ Tech Stack
*   **Backend:** Python 3.12, Flask
*   **Machine Learning/NLP:** NLTK, Scikit-Learn, Pandas
*   **Frontend:** HTML5, CSS3 (Glassmorphism), JavaScript (Fetch API)
*   **Tools:** Conda, GitHub Desktop

---

## 📂 Project Structure
```text
├── app.py              # Flask server, NLP function and routing logic
├── static/
│   ├── style.css       # Modern dark-mode styling
│   └── script.js       # Frontend interaction logic
├── templates/
│   └── index.html      # Main UI structure
├── vectorizer.pkl      # Saved TF-IDF Vectorizer
├── tfidf_matrix.pkl    # Saved TF-IDF Matrix
└── requirements.txt    # Project dependencies
```


---

## 🚀 Installation & Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/DevBySuraj/CodeAlpha_Chatbot_for_FAQs.git
    ```

    ----

    ```bash
    cd CodeAlpha_Chatbot_for_FAQs
    ```

2.  **Environment Setup:**

    ```bash
    conda create -n faq_chatbot python=3.12
    conda activate faq_chatbot
    pip install -r requirements.txt
    ```

3.  **Run the Application:**
    ```bash
    python app.py
    ```
