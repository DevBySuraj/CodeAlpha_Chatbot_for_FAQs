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

@app.route('/ask', methods=['POST'])
def ask():
    data = request.get_json()
    user_query = data.get("message")
    response_text = get_chatbot_response(user_query)
    return jsonify({"response": response_text})

if __name__ == "__main__":
    app.run(debug=True)