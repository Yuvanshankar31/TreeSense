/* ==========================================================================
   GreenPulse AI Forest Assistant - RAG Chatbot Controller
   ========================================================================== */

(function () {
  // Knowledge Base Fallback - ensures 100% uptime if JSON file fetch is blocked or fails
  const fallbackKnowledge = [
    {
      "id": "reserve_overview",
      "title": "GreenPulse Forest Reserve Overview",
      "category": "general",
      "tags": ["reserve", "overview", "area", "location", "greenpulse", "forest", "geography"],
      "content": "The GreenPulse Forest Reserve is a protected conservation zone located along the biodiverse Western Ghats region. It covers a total geographical area of 12,500 hectares. The reserve is characterized by mountainous terrain ranging from 600m to 1,200m in altitude, serving as a critical ecological corridor that supports rich native flora and fauna, and records an average forest canopy density of 78%."
    },
    {
      "id": "tree_enumeration",
      "title": "Tree Enumeration & Counts (Sector-wise)",
      "category": "metrics",
      "tags": ["tree count", "enumeration", "sector", "density", "total trees", "statistics"],
      "content": "Using advanced aerial imaging and YOLOv8 object detection, the reserve is divided into sectors for tree counting: Sector A (North Reserve) has 1,245 trees detected; Sector B (East Ridge) has 948 trees detected; Sector C (Valley Area) has 1,510 trees detected; Sector D (South Slope) has 822 trees detected. Across all currently surveyed sectors, a total of 4,525 trees have been cataloged with high precision."
    },
    {
      "id": "canopy_coverage",
      "title": "Green Canopy Cover Estimations",
      "category": "metrics",
      "tags": ["canopy", "green cover", "coverage", "percentage", "density", "vegetation"],
      "content": "Green canopy cover is analyzed dynamically using channel-based color segmentation. Sector A maintains 82.4% green cover; Sector B registers 71.5% green cover; Sector C leads with 85.1% green cover; Sector D stands at 64.3% green cover. The overall average canopy coverage for the reserve is approximately 75.8%, with the remaining area classified as waterways, rocks, or bare soil patches."
    },
    {
      "id": "species_distribution",
      "title": "Tree Species Distribution",
      "category": "biodiversity",
      "tags": ["species", "types of trees", "distribution", "teak", "rosewood", "sandalwood", "bamboo", "eucalyptus"],
      "content": "The forest reserve exhibits a diverse mix of native and commercial tree species: Teak (Tectona grandis) accounts for 35% of the total tree population; Rosewood (Dalbergia latifolia) makes up 18%; Sandalwood (Santalum album) represents 12%, situated primarily in the dry-deciduous zones of East Ridge; Bamboo groves (Bambusoideae) cover 20%, mostly in moist parts of Sector A; and Eucalyptus (Eucalyptus globulus) stands represent 15%, located in reclamation zones."
    },
    {
      "id": "carbon_sequestration",
      "title": "Biomass and Carbon Sequestration Estimates",
      "category": "environment",
      "tags": ["carbon", "sequestration", "co2", "biomass", "offset", "credits", "environment"],
      "content": "The total estimated above-ground biomass of the GreenPulse reserve is approximately 2,450,000 metric tonnes. The average carbon sequestration rate is calculated at 4.8 tonnes of CO2 equivalent per hectare per year. Annually, the reserve offsets approximately 60,000 metric tonnes of atmospheric CO2. On an individual basis, each mature native tree in the forest stores an average of 0.85 tonnes of carbon dioxide equivalent."
    },
    {
      "id": "forest_health_index",
      "title": "Forest Health Index (FHI)",
      "category": "health",
      "tags": ["forest health", "fhi", "stressed", "healthy", "bare soil", "vegetative condition"],
      "content": "The Forest Health Index (FHI) measures vegetative health based on HSL color space analysis and relative green-channel reflectivity. The reserve has an overall FHI of 7.6 out of 10, classified as 'Healthy'. The vegetation status breakdown is: 76.5% Healthy (vigorous canopy growth), 18.2% Stressed (drier canopy under seasonal water stress, common in summer), and 5.3% Bare Soil or Degraded land requiring restoration."
    },
    {
      "id": "optimal_pathing",
      "title": "Optimal Pathing & Navigation Tool",
      "category": "tools",
      "tags": ["pathing", "navigation", "route", "terrain", "friction cost", "patrol"],
      "content": "The Optimal Pathing tool computes the safest and most efficient path between coordinates in the forest using Dijkstra and A* pathfinding. The algorithm considers terrain slope, water bodies, and canopy friction costs to draft paths. This tool is designed for forest ranger patrol routes, search-and-rescue operations, and identifying fire containment lines with minimal environmental impact."
    },
    {
      "id": "weather_meteorological",
      "title": "Weather and Climate Trends",
      "category": "climate",
      "tags": ["weather", "temperature", "rainfall", "monsoon", "climate", "humidity"],
      "content": "GreenPulse experiences a tropical wet-and-dry climate with an average annual rainfall of 1,850 mm. The monsoon peak occurs in July with an average of 450 mm of precipitation. The annual mean temperature is 24.5°C, with April being the hottest month (average high of 32°C) and January being the coolest month (average low of 18°C). Average relative humidity stays around 72%."
    },
    {
      "id": "air_quality",
      "title": "Air Quality Index (AQI)",
      "category": "environment",
      "tags": ["aqi", "air quality", "pm2.5", "pollution", "ozone", "metrics"],
      "content": "The forest reserve maintains pristine air quality. The core reserve area boasts an AQI ranging from 15 to 35 PM2.5, which falls under the 'Excellent/Good' category. Near the southern perimeter borders close to highways, the AQI is slightly elevated to a 'Moderate' range of 45 to 65 PM2.5 due to highway traffic emissions. The high density of trees serves as an effective natural particulate filter."
    },
    {
      "id": "website_tools",
      "title": "How to Use the Website Tools",
      "category": "help",
      "tags": ["help", "dashboard", "tools", "how to", "use", "upload"],
      "content": "The GreenPulse dashboard offers multiple analytical panels: 1) Tree Count uses YOLOv8 model inference on uploaded aerial images; 2) Green Cover Estimator applies pixel-level color segmentation; 3) Tree Species Identifier maps species on a Google Map boundary; 4) Optimal Pathing designs routes on slope maps; 5) Forest Health analyzer calculates index using canopy image analysis; 6) Historical Data displays historical weather and temperature charts."
    }
  ];

  let knowledgeBase = [...fallbackKnowledge];
  let conversationHistory = [];

  // Load actual JSON data to replace fallback when served
  async function loadKnowledgeBase() {
    try {
      const response = await fetch('/src/assets/data/project_knowledge.json');
      if (response.ok) {
        knowledgeBase = await response.json();
        console.log("GreenPulse RAG knowledge base loaded successfully.");
      }
    } catch (e) {
      console.warn("Could not fetch project_knowledge.json. Using embedded knowledge base fallback.", e);
    }
  }

  // Inject Chat Elements to DOM
  function createChatbotUI() {
    // 1. Launcher button
    const launcher = document.createElement('div');
    launcher.className = 'gp-chat-launcher';
    launcher.id = 'gp-chat-launcher';
    launcher.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
    `;
    document.body.appendChild(launcher);

    // 2. Chat window container
    const container = document.createElement('div');
    container.className = 'gp-chat-container';
    container.id = 'gp-chat-container';
    container.innerHTML = `
      <div class="gp-chat-header">
        <div class="gp-chat-profile">
          <div class="gp-chat-avatar">🌲</div>
          <div class="gp-chat-title-group">
            <h3>GreenPulse AI</h3>
            <span>Forest Assistant</span>
          </div>
        </div>
        <div class="gp-chat-header-actions">
          <button class="gp-chat-header-btn" id="gp-chat-settings-btn" title="AI Configuration">⚙️</button>
          <button class="gp-chat-header-btn" id="gp-chat-close-btn" title="Minimize">✕</button>
        </div>
      </div>
      
      <div class="gp-chat-settings" id="gp-chat-settings">
        <h4>Gemini API Settings</h4>
        <p>Save your Gemini API Key in the browser's local storage. This is kept entirely private to your browser.</p>
        <input type="password" id="gp-api-key-input" placeholder="Enter API Key (AIzaSy...)">
        <button class="btn-save-key" id="gp-save-key-btn">Save Configurations</button>
      </div>

      <div class="gp-chat-messages" id="gp-chat-messages"></div>
      
      <div class="gp-quick-prompts" id="gp-quick-prompts"></div>

      <div class="gp-chat-input-bar">
        <textarea class="gp-chat-input" id="gp-chat-input" placeholder="Ask about counts, species, health..." rows="1"></textarea>
        <button class="gp-chat-send-btn" id="gp-chat-send" aria-label="Send message">
          <svg viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(container);

    setupEventListeners();
    addSystemMessage("Welcome! Ask me any questions about the GreenPulse Forest Reserve (such as tree counts, species, weather, carbon offsets, or how to use the dashboard). Make sure to configure your Gemini API Key in settings for live responses.");
    showQuickPrompts();
  }

  // Setup UI event listeners
  function setupEventListeners() {
    const launcher = document.getElementById('gp-chat-launcher');
    const container = document.getElementById('gp-chat-container');
    const closeBtn = document.getElementById('gp-chat-close-btn');
    const settingsBtn = document.getElementById('gp-chat-settings-btn');
    const settingsPanel = document.getElementById('gp-chat-settings');
    const apiKeyInput = document.getElementById('gp-api-key-input');
    const saveKeyBtn = document.getElementById('gp-save-key-btn');
    const sendBtn = document.getElementById('gp-chat-send');
    const textInput = document.getElementById('gp-chat-input');

    // Populate Key if saved
    const savedKey = localStorage.getItem('gp_gemini_api_key');
    if (savedKey) {
      apiKeyInput.value = savedKey;
    }

    // Toggle container
    launcher.addEventListener('click', () => {
      container.classList.toggle('active');
      launcher.classList.toggle('active');
      if (container.classList.contains('active')) {
        textInput.focus();
        scrollFeedToBottom();
      }
    });

    // Close container
    closeBtn.addEventListener('click', () => {
      container.classList.remove('active');
      launcher.classList.remove('active');
    });

    // Toggle settings panel
    settingsBtn.addEventListener('click', () => {
      settingsPanel.classList.toggle('active');
    });

    // Save configuration
    saveKeyBtn.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      localStorage.setItem('gp_gemini_api_key', key);
      settingsPanel.classList.remove('active');
      if (key) {
        addSystemMessage("Gemini API key updated successfully! Connected in Live Mode.");
      } else {
        addSystemMessage("API key cleared. Switched back to Offline Demo Mode.");
      }
    });

    // Input text sending
    sendBtn.addEventListener('click', handleSendMessage);
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  // Show quick prompts
  function showQuickPrompts() {
    const prompts = [
      "What are the tree species?",
      "Canopy cover sectors",
      "Total Carbon offsets",
      "Average Forest Health Index",
      "Weather statistics"
    ];
    const quickPromptsDiv = document.getElementById('gp-quick-prompts');
    quickPromptsDiv.innerHTML = '';
    prompts.forEach(promptText => {
      const chip = document.createElement('div');
      chip.className = 'gp-prompt-chip';
      chip.innerText = promptText;
      chip.addEventListener('click', () => {
        const input = document.getElementById('gp-chat-input');
        input.value = promptText;
        handleSendMessage();
      });
      quickPromptsDiv.appendChild(chip);
    });
  }

  // Scroll message feed to bottom
  function scrollFeedToBottom() {
    const feed = document.getElementById('gp-chat-messages');
    feed.scrollTop = feed.scrollHeight;
  }

  // Append Message Bubbles
  function addMessage(role, text) {
    const feed = document.getElementById('gp-chat-messages');
    const msg = document.createElement('div');
    msg.className = `gp-message ${role}`;

    const content = document.createElement('div');
    content.className = 'gp-message-content';
    content.innerHTML = formatMessageMarkdown(text);
    msg.appendChild(content);

    const time = document.createElement('div');
    time.className = 'gp-message-time';
    const now = new Date();
    time.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msg.appendChild(time);

    feed.appendChild(msg);
    scrollFeedToBottom();
  }

  // Append system messages
  function addSystemMessage(text) {
    addMessage('system', text);
  }

  // Simplified Markdown parser
  function formatMessageMarkdown(text) {
    // Escape HTML to prevent XSS
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Convert newlines to breaks
    escaped = escaped.replace(/\n/g, '<br>');

    // Bold text (**text**)
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic text (*text*)
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Inline code (`code`)
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bulleted lists (- item or * item)
    escaped = escaped.replace(/(?:^|<br>)\s*[\-\*]\s+([^\n<]+)/g, '<li>$1</li>');
    escaped = escaped.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    // Remove consecutive nested list blocks
    escaped = escaped.replace(/<\/ul>\s*<ul>/g, '');

    return escaped;
  }

  // RAG Retriever
  function retrieveRelevantDocs(query) {
    const stopWords = new Set(["the", "is", "at", "what", "how", "of", "and", "in", "to", "a", "an", "for", "with", "on", "about", "me", "show", "tell", "what's", "are", "you", "does", "any", "which"]);
    const tokens = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t && !stopWords.has(t));
    
    // Inject dynamic browser session states (coordinates / locations)
    const dynamicData = {
      title: "Current Selected Location Metrics",
      content: `User selected location coordinates: Latitude: ${localStorage.getItem('selectedLatitude') || '23.2599'}, Longitude: ${localStorage.getItem('selectedLongitude') || '77.4126'}. Location Label: ${localStorage.getItem('selectedLocation') || 'Default Bhopal area'}.`
    };

    const corpus = [dynamicData, ...knowledgeBase];

    if (tokens.length === 0) {
      return corpus.slice(0, 3);
    }

    const scored = corpus.map(doc => {
      let score = 0;
      const contentLower = doc.content.toLowerCase();
      const titleLower = doc.title.toLowerCase();
      const tags = doc.tags || [];

      tokens.forEach(token => {
        if (tags.some(tag => tag.toLowerCase().includes(token))) {
          score += 4;
        }
        if (titleLower.includes(token)) {
          score += 2.5;
        }
        if (contentLower.includes(token)) {
          score += 1;
        }
      });
      return { doc, score };
    });

    const matches = scored.filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    if (matches.length === 0) {
      return corpus.slice(1, 4); // return general fallback docs
    }
    return matches.slice(0, 3).map(item => item.doc);
  }

  // Handle Send Message Actions
  async function handleSendMessage() {
    const input = document.getElementById('gp-chat-input');
    const queryText = input.value.trim();
    if (!queryText) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Show User Message
    addMessage('user', queryText);

    // Show Loading Typing Indicator
    const typingIndicator = showTypingIndicator();

    try {
      const apiKey = localStorage.getItem('gp_gemini_api_key');
      const retrievedDocs = retrieveRelevantDocs(queryText);

      // Build context string
      const contextStr = retrievedDocs.map(doc => `Title: ${doc.title}\nContent: ${doc.content}`).join("\n\n");

      if (!apiKey) {
        // Offline Mock/Demo response based on retrieved docs
        setTimeout(() => {
          removeTypingIndicator(typingIndicator);
          let responseText = `*(Offline Demo Mode)* Here is the matching information I retrieved from the GreenPulse local database:\n\n`;
          retrievedDocs.forEach((doc, i) => {
            responseText += `**${i+1}. ${doc.title}**\n${doc.content}\n\n`;
          });
          responseText += `\n*Note: To enable full AI chat conversations, configure a Gemini API key in the settings (⚙️) panel.*`;
          addMessage('assistant', responseText);
        }, 800);
        return;
      }

      // Prepare conversation history context
      const chatHistoryPrompt = conversationHistory.slice(-6).map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join("\n");

      // API Request to Gemini
      const prompt = `System Instructions: You are the GreenPulse AI Forest Assistant, an expert chatbot. Answer the user's question accurately. You must ground your answer strictly in the provided Context. If the information is not available in the context, state that you do not have that specific database record, and suggest checking other dashboard tools or related parameters. Maintain a friendly and professional tone.

Context:
${contextStr}

Conversation History:
${chatHistoryPrompt}

User Question: ${queryText}
Assistant Answer:`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      removeTypingIndicator(typingIndicator);

      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        const reply = data.candidates[0].content.parts[0].text;
        addMessage('assistant', reply);
        
        // Save to chat history
        conversationHistory.push({ role: 'user', text: queryText });
        conversationHistory.push({ role: 'assistant', text: reply });
      } else {
        throw new Error("Invalid response format from Gemini API");
      }

    } catch (err) {
      removeTypingIndicator(typingIndicator);
      console.error(err);
      addMessage('assistant', `⚠️ Sorry, I encountered an error communicating with the Gemini API. Please make sure your API key is correct and valid in settings.\n\nError: ${err.message}`);
    }
  }

  // Create loading dot indicator
  function showTypingIndicator() {
    const feed = document.getElementById('gp-chat-messages');
    const msg = document.createElement('div');
    msg.className = 'gp-message assistant typing-indicator-msg';
    
    const content = document.createElement('div');
    content.className = 'gp-message-content';
    content.innerHTML = `
      <div class="gp-typing-indicator">
        <div class="gp-dot"></div>
        <div class="gp-dot"></div>
        <div class="gp-dot"></div>
      </div>
    `;
    msg.appendChild(content);
    feed.appendChild(msg);
    scrollFeedToBottom();
    return msg;
  }

  function removeTypingIndicator(indicatorElement) {
    if (indicatorElement && indicatorElement.parentNode) {
      indicatorElement.parentNode.removeChild(indicatorElement);
    }
  }

  // Initialize Chatbot when script is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadKnowledgeBase().then(createChatbotUI);
    });
  } else {
    loadKnowledgeBase().then(createChatbotUI);
  }
})();
