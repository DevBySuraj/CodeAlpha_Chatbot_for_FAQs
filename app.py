import flask
import pandas as pd
import numpy as np
from flask import Flask,request,app,jsonify,url_for,render_template
import pickle

import nltk
import pandas as pd
import ast
import numpy as np

import pandas as pd
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import string

from sklearn.metrics.pairwise import cosine_similarity

#import the tf and the matrix for comparison

# 1. Load the Vectorizer
with open('vectorizer.pkl', 'rb') as f:
    tf = pickle.load(f)

# 2. Load the TF-IDF / Count Matrix
with open('tfidf_matrix.pkl', 'rb') as f:
    tf_matrix = pickle.load(f)

# 3. dataset for the answers
faq = pd.read_csv('cleaned_amazon_data.csv')


# --------------------------------preprocess function----------------------------------------
# Initialize the tools
lemmatizer = WordNetLemmatizer() #base for changer
stop_words = set(stopwords.words('english')) #stop words removal

def preprocess_text(text):
    # 1. Convert to lowercase
    text = text.lower()
    # print(text)
    
    # 2. Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    # print(text)
    
    # 3. Tokenize (split into words)
    tokens = nltk.word_tokenize(text)
    # print(tokens)
    
    # 4. Remove stopwords and Lemmatize
    clean_tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stop_words]
    # print(clean_tokens)
    
    return " ".join(clean_tokens)


#--------------preprocessing and cosine similarity-----------------
def get_chatbot_response(user_input):
    # 1. Preprocess the user's question
    cleaned_input = preprocess_text(user_input)
    
    # 2. Transform input to vector (using the SAME vectorizer)
    user_vector = tf.transform([cleaned_input])
    
    # 3. Calculate similarity between user input and all faq questions
    # This returns an array of scores between 0 and 1
    similarities = cosine_similarity(user_vector, tf_matrix)
    # print("similarity",similarities)
    # 4. Find the index of the highest score
    best_match_index = similarities.argmax()
    max_similarity = similarities[0][best_match_index]
    
    # 5. Set a threshold (if score is too low, the bot didn't understand)
    if max_similarity > 0.2:
        return faq['Answer'].iloc[best_match_index]
    else:
        return "I'm sorry, I don't understand that question. Could you try rephrasing?"


# 1. Initialize the app instance
app = Flask(__name__) 

# 2. Use 'app.route', NOT 'flask.app.route' or 'Flask.route'
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    data = request.get_json()
    user_query = data.get("message", "")
    
    # Process
    text = user_query.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    # 1. Tokenize
    tokens = nltk.word_tokenize(text)
    
    # 2. Stop-word removal
    no_stop_tokens = [word for word in tokens if word not in stop_words]
    
    # 3. Lemmatize
    clean_tokens = [lemmatizer.lemmatize(word) for word in no_stop_tokens]
    
    cleaned_text = " ".join(clean_tokens)
    
    return jsonify({
        "raw": user_query,
        "tokens": tokens,
        "no_stop_tokens": no_stop_tokens,
        "cleaned_tokens": clean_tokens,
        "cleaned_text": cleaned_text
    })

@app.route('/vectorize', methods=['POST'])
def vectorize():
    data = request.get_json()
    cleaned_text = data.get("cleaned_text", "")
    
    user_vector = tf.transform([cleaned_text])
    
    # Get non-zero features and their weights
    feature_names = tf.get_feature_names_out()
    non_zero_indices = user_vector.nonzero()[1]
    
    important_terms = {feature_names[idx]: float(user_vector[0, idx]) for idx in non_zero_indices}
    # Sort by weight
    important_terms = dict(sorted(important_terms.items(), key=lambda item: item[1], reverse=True))
    
    return jsonify({
        "important_terms": important_terms
    })

@app.route('/similarity', methods=['POST'])
def similarity():
    data = request.get_json()
    cleaned_text = data.get("cleaned_text", "")
    
    user_vector = tf.transform([cleaned_text])
    similarities = cosine_similarity(user_vector, tf_matrix)
    
    # Get top 5 indices
    top_indices = np.argsort(similarities[0])[-5:][::-1]
    
    candidates = []
    for idx in top_indices:
        candidates.append({
            "index": int(idx),
            "score": float(similarities[0][idx]),
            "question": faq['Question'].iloc[idx] if 'Question' in faq.columns else "Matched FAQ",
            "answer": faq['Answer'].iloc[idx] if 'Answer' in faq.columns else "Matched Answer"
        })
        
    best_match_index = candidates[0]['index']
    max_similarity = candidates[0]['score']
    matched_question = candidates[0]['question']
    
    # Word Cloud Triggers
    best_faq_vector = tf_matrix[best_match_index]
    intersection = user_vector.multiply(best_faq_vector)
    
    feature_names = tf.get_feature_names_out()
    non_zero_indices = intersection.nonzero()[1]
    
    trigger_words = {feature_names[idx]: float(intersection[0, idx]) for idx in non_zero_indices}
    trigger_words = dict(sorted(trigger_words.items(), key=lambda item: item[1], reverse=True))
    
    return jsonify({
        "best_match_index": best_match_index,
        "score": max_similarity,
        "matched_question": matched_question,
        "candidates": candidates,
        "trigger_words": trigger_words
    })

@app.route('/decision', methods=['POST'])
def decision():
    data = request.get_json()
    best_match_index = data.get("best_match_index", 0)
    score = data.get("score", 0.0)
    threshold = data.get("threshold", 0.2)
    
    if score > threshold:
        response_text = faq['Answer'].iloc[best_match_index]
        success = True
    else:
        response_text = "I'm sorry, I don't understand that question. Could you try rephrasing?"
        success = False
        
    return jsonify({
        "response": response_text,
        "confidence": score,
        "success": success
    })

if __name__ == "__main__":
    app.run(debug=True)