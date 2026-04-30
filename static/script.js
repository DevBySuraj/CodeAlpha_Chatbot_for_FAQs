const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const thresholdSlider = document.getElementById('threshold-slider');
const thresholdVal = document.getElementById('threshold-val');
const downloadLogBtn = document.getElementById('download-log-btn');

let chatHistory = [];
let sessionLogs = [];

// Load chat history from localStorage
function loadChatHistory() {
    const saved = localStorage.getItem('surgicalFaqChat');
    if (saved) {
        chatHistory = JSON.parse(saved);
        chatBox.innerHTML = ''; // clear default message
        chatHistory.forEach(msg => {
            appendMessage(msg.text, msg.sender, false);
        });
    }
}

// Save chat history to localStorage
function saveChatHistory() {
    localStorage.setItem('surgicalFaqChat', JSON.stringify(chatHistory));
}

thresholdSlider.addEventListener('input', (e) => {
    thresholdVal.innerText = e.target.value;
});

function appendMessage(text, sender, save = true) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    if (save) {
        chatHistory.push({ text, sender });
        saveChatHistory();
    }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function resetPipeline() {
    document.querySelectorAll('.step-card').forEach(card => {
        card.classList.remove('active', 'success', 'error');
    });
    document.querySelectorAll('.connector').forEach(conn => {
        conn.classList.remove('active');
    });

    document.getElementById('step-raw').innerText = 'Waiting for input...';
    document.getElementById('step-tokens').innerText = '--';
    document.getElementById('step-no-stopwords').innerText = '--';
    document.getElementById('step-lemmatized').innerText = '--';
    document.getElementById('step-vector').innerHTML = '--';
    document.getElementById('step-trigger-words').innerHTML = '--';
    document.getElementById('step-candidates').innerHTML = '<li class="empty-list">--</li>';
    document.getElementById('step-confidence').innerText = '0%';
    document.getElementById('meter-fill').style.width = '0%';
    document.getElementById('meter-fill').style.background = 'linear-gradient(90deg, #38bdf8, #818cf8)';
    document.getElementById('step-decision').innerText = '--';
}

function activateCard(cardId, connectorId = null) {
    document.getElementById(cardId).classList.add('active');
    if (connectorId) {
        document.getElementById(connectorId).classList.add('active');
    }
    // Scroll pipeline to view
    const card = document.getElementById(cardId);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage(message, 'user');
    userInput.value = '';
    sendBtn.disabled = true;

    resetPipeline();

    // Check for greeting
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'sup', 'howdy'];
    const cleanMsg = message.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const isGreeting = greetings.includes(cleanMsg) || (cleanMsg.split(' ').length <= 2 && greetings.includes(cleanMsg.split(' ')[0]));

    if (isGreeting) {
        document.getElementById('step-raw').innerText = message;
        activateCard('card-raw');
        await sleep(600);
        
        document.getElementById('step-tokens').innerText = 'Skipped (Greeting detected)';
        activateCard('card-cleaned', 'conn-1');
        await sleep(400);
        
        const reply = "Hi! How can I help you with your Amazon questions today?";
        appendMessage(reply, 'bot');
        
        sessionLogs.push({
            timestamp: new Date().toISOString(),
            raw_input: message,
            cleaned_text: "greeting",
            top_match: "N/A",
            confidence_score: 1.0,
            success: true,
            response: reply
        });

        sendBtn.disabled = false;
        userInput.focus();
        return;
    }

    try {
        // Step 1: Raw Input
        document.getElementById('step-raw').innerText = message;
        activateCard('card-raw');
        await sleep(600);

        // API Call 1: Process
        const processRes = await fetch('/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const processData = await processRes.json();
        
        document.getElementById('step-tokens').innerText = processData.tokens.length ? processData.tokens.join(' | ') : "No valid tokens";
        document.getElementById('step-no-stopwords').innerText = processData.no_stop_tokens.length ? processData.no_stop_tokens.join(' | ') : "None";
        document.getElementById('step-lemmatized').innerText = processData.cleaned_tokens.length ? processData.cleaned_tokens.join(' | ') : "None";
        
        activateCard('card-cleaned', 'conn-1');
        await sleep(800);

        // API Call 2: Vectorize
        const vectorizeRes = await fetch('/vectorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cleaned_text: processData.cleaned_text })
        });
        const vectorizeData = await vectorizeRes.json();

        const vectorContainer = document.getElementById('step-vector');
        vectorContainer.innerHTML = '';
        if (Object.keys(vectorizeData.important_terms).length === 0) {
            vectorContainer.innerHTML = '<i>Zero Vector (No matches in vocabulary)</i>';
        } else {
            for (const [term, weight] of Object.entries(vectorizeData.important_terms)) {
                const tag = document.createElement('div');
                tag.classList.add('vector-tag');
                tag.style.animationDelay = `${Math.random() * 0.3}s`;
                tag.innerHTML = `${term} <span class="weight">${weight.toFixed(2)}</span>`;
                vectorContainer.appendChild(tag);
            }
        }
        activateCard('card-vector', 'conn-2');
        await sleep(1000);

        // API Call 3: Similarity
        const similarityRes = await fetch('/similarity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cleaned_text: processData.cleaned_text })
        });
        const simData = await similarityRes.json();

        // Trigger Words (Word Cloud)
        const triggerContainer = document.getElementById('step-trigger-words');
        triggerContainer.innerHTML = '';
        if (Object.keys(simData.trigger_words).length === 0) {
            triggerContainer.innerHTML = '<i>No overlapping terms</i>';
        } else {
            for (const [term, weight] of Object.entries(simData.trigger_words)) {
                const tag = document.createElement('div');
                tag.classList.add('vector-tag', 'trigger-tag');
                tag.style.animationDelay = `${Math.random() * 0.3}s`;
                tag.innerHTML = `${term} <span class="weight">${weight.toFixed(2)}</span>`;
                triggerContainer.appendChild(tag);
            }
        }

        // Top 5 Candidates
        const candList = document.getElementById('step-candidates');
        candList.innerHTML = '';
        simData.candidates.forEach((cand, idx) => {
            const li = document.createElement('li');
            li.style.animationDelay = `${idx * 0.1}s`;
            if (idx === 0) li.classList.add('top-match');
            
            li.innerHTML = `
                <div class="cand-q" title="${cand.question}">${cand.question}</div>
                <div class="cand-score">${(cand.score * 100).toFixed(1)}%</div>
            `;
            candList.appendChild(li);
        });

        const confPercentage = Math.round(simData.score * 100);
        document.getElementById('step-confidence').innerText = confPercentage + '%';
        
        const meter = document.getElementById('meter-fill');
        meter.style.width = confPercentage + '%';
        if (confPercentage >= 80) meter.style.background = "#22c55e";
        else if (confPercentage >= 40) meter.style.background = "#eab308";
        else meter.style.background = "#ef4444";

        activateCard('card-similarity', 'conn-3');
        await sleep(1000);

        // API Call 4: Decision
        const threshold = parseFloat(thresholdSlider.value);
        const decisionRes = await fetch('/decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                best_match_index: simData.best_match_index, 
                score: simData.score, 
                threshold: threshold 
            })
        });
        const decisionData = await decisionRes.json();

        document.getElementById('step-decision').innerText = decisionData.success 
            ? `Match found (Score ${simData.score.toFixed(2)} > ${threshold}). Replying with answer.` 
            : `Low confidence (Score ${simData.score.toFixed(2)} <= ${threshold}). Triggering fallback.`;
            
        activateCard('card-decision', 'conn-4');
        
        const decCard = document.getElementById('card-decision');
        if (decisionData.success) {
            decCard.classList.add('success');
        } else {
            decCard.classList.add('error');
        }

        // Save session log
        sessionLogs.push({
            timestamp: new Date().toISOString(),
            raw_input: message,
            cleaned_text: processData.cleaned_text,
            top_match: simData.matched_question,
            confidence_score: simData.score,
            success: decisionData.success,
            response: decisionData.response
        });

        await sleep(600);
        appendMessage(decisionData.response, 'bot');

    } catch (error) {
        console.error("Pipeline Error:", error);
        appendMessage("Sorry, the NLP pipeline encountered an error.", 'bot');
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// Download Log functionality
downloadLogBtn.addEventListener('click', () => {
    if (sessionLogs.length === 0) {
        alert("No session logs available yet.");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionLogs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "faq_session_log.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Initialize
loadChatHistory();
userInput.focus();