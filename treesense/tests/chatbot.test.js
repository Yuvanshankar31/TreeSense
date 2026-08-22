import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadScript } from './helpers/loadScript.js';

const CUSTOM_KNOWLEDGE = [
  {
    id: 'bamboo_doc',
    title: 'Bamboo Groves',
    category: 'biodiversity',
    tags: ['bamboo'],
    content: 'Bamboo groves cover the moist parts of Sector A.',
  },
  {
    id: 'fire_doc',
    title: 'Fire Watch Towers',
    category: 'safety',
    tags: ['fire'],
    content: 'Six fire watch towers monitor the reserve during dry season.',
  },
  {
    id: 'rain_doc',
    title: 'Rainfall Gauges',
    category: 'climate',
    tags: ['rainfall'],
    content: 'Twelve automated rain gauges record daily precipitation.',
  },
];

/** Fetch stub answering the knowledge-base request, then the Gemini request. */
function stubFetch({ knowledge = null, gemini = null } = {}) {
  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes('project_knowledge.json')) {
      if (!knowledge) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => knowledge };
    }
    if (gemini) return gemini;
    throw new Error('unexpected request');
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function bootChatbot(options) {
  const fetchMock = stubFetch(options);
  await loadScript('chatbot');
  await vi.runAllTimersAsync();
  return fetchMock;
}

function messages() {
  return [...document.querySelectorAll('#gp-chat-messages .gp-message')];
}

function lastMessageHtml() {
  const all = messages();
  return all[all.length - 1].querySelector('.gp-message-content').innerHTML;
}

async function ask(question) {
  document.getElementById('gp-chat-input').value = question;
  document.getElementById('gp-chat-send').click();
  await vi.runAllTimersAsync();
}

describe('chatbot.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('initialisation', () => {
    it('injects the launcher, chat window and welcome message', async () => {
      await bootChatbot();

      expect(document.getElementById('gp-chat-launcher')).not.toBeNull();
      expect(document.getElementById('gp-chat-container')).not.toBeNull();
      expect(document.getElementById('gp-chat-input')).not.toBeNull();
      const welcome = messages()[0];
      expect(welcome.className).toContain('system');
      expect(welcome.textContent).toContain('GreenPulse Forest Reserve');
    });

    it('renders the quick prompt chips', async () => {
      await bootChatbot();

      const chips = [...document.querySelectorAll('#gp-quick-prompts .gp-prompt-chip')];
      expect(chips).toHaveLength(5);
      expect(chips.map((chip) => chip.innerText)).toContain('Weather statistics');
    });

    it('sends a quick prompt as the user query when a chip is clicked', async () => {
      await bootChatbot();

      document.querySelectorAll('#gp-quick-prompts .gp-prompt-chip')[0].click();
      await vi.runAllTimersAsync();

      expect(messages()[1].textContent).toContain('What are the tree species?');
    });

    it('keeps working when the knowledge base file cannot be fetched', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('blocked')));
      await loadScript('chatbot');
      await vi.runAllTimersAsync();

      expect(document.getElementById('gp-chat-container')).not.toBeNull();
      await ask('bamboo');
      expect(lastMessageHtml()).toContain('Tree Species Distribution');
    });

    it('prefills the settings input with a previously saved API key', async () => {
      localStorage.setItem('gp_gemini_api_key', 'AIzaSy-saved');
      await bootChatbot();

      expect(document.getElementById('gp-api-key-input').value).toBe('AIzaSy-saved');
    });
  });

  describe('window and settings controls', () => {
    it('toggles the chat window from the launcher and closes it from the header', async () => {
      await bootChatbot();
      const launcher = document.getElementById('gp-chat-launcher');
      const container = document.getElementById('gp-chat-container');

      launcher.click();
      expect(container.classList.contains('active')).toBe(true);
      expect(launcher.classList.contains('active')).toBe(true);

      document.getElementById('gp-chat-close-btn').click();
      expect(container.classList.contains('active')).toBe(false);
      expect(launcher.classList.contains('active')).toBe(false);
    });

    it('toggles the settings panel', async () => {
      await bootChatbot();
      const panel = document.getElementById('gp-chat-settings');

      document.getElementById('gp-chat-settings-btn').click();
      expect(panel.classList.contains('active')).toBe(true);

      document.getElementById('gp-chat-settings-btn').click();
      expect(panel.classList.contains('active')).toBe(false);
    });

    it('persists a trimmed API key and confirms live mode', async () => {
      await bootChatbot();
      document.getElementById('gp-chat-settings-btn').click();
      document.getElementById('gp-api-key-input').value = '  AIzaSy-new  ';

      document.getElementById('gp-save-key-btn').click();

      expect(localStorage.getItem('gp_gemini_api_key')).toBe('AIzaSy-new');
      expect(document.getElementById('gp-chat-settings').classList.contains('active')).toBe(false);
      expect(lastMessageHtml()).toContain('Live Mode');
    });

    it('reports offline mode when the API key is cleared', async () => {
      localStorage.setItem('gp_gemini_api_key', 'AIzaSy-old');
      await bootChatbot();
      document.getElementById('gp-api-key-input').value = '';

      document.getElementById('gp-save-key-btn').click();

      expect(localStorage.getItem('gp_gemini_api_key')).toBe('');
      expect(lastMessageHtml()).toContain('Offline Demo Mode');
    });
  });

  describe('sending messages', () => {
    it('ignores empty or whitespace-only input', async () => {
      await bootChatbot();
      const before = messages().length;

      await ask('    ');

      expect(messages()).toHaveLength(before);
    });

    it('renders the question, clears the input and answers', async () => {
      await bootChatbot({ knowledge: CUSTOM_KNOWLEDGE });

      await ask('Tell me about bamboo');

      expect(document.getElementById('gp-chat-input').value).toBe('');
      const rendered = messages();
      expect(rendered[1].className).toContain('user');
      expect(rendered[1].textContent).toContain('Tell me about bamboo');
      expect(rendered[2].className).toContain('assistant');
    });

    it('submits on Enter but inserts a newline on Shift+Enter', async () => {
      await bootChatbot({ knowledge: CUSTOM_KNOWLEDGE });
      const input = document.getElementById('gp-chat-input');

      input.value = 'bamboo';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
      await vi.runAllTimersAsync();
      expect(input.value).toBe('bamboo');

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await vi.runAllTimersAsync();
      expect(input.value).toBe('');
      expect(lastMessageHtml()).toContain('Bamboo Groves');
    });

    it('removes the typing indicator once the answer arrives', async () => {
      await bootChatbot({ knowledge: CUSTOM_KNOWLEDGE });

      await ask('bamboo');

      expect(document.querySelectorAll('.typing-indicator-msg')).toHaveLength(0);
    });
  });

  describe('offline retrieval mode', () => {
    it('answers with the documents whose tags match the query', async () => {
      await bootChatbot({ knowledge: CUSTOM_KNOWLEDGE });

      await ask('How many rainfall gauges are there?');

      const html = lastMessageHtml();
      expect(html).toContain('Offline Demo Mode');
      expect(html).toContain('Rainfall Gauges');
      expect(html).toContain('Twelve automated rain gauges');
      expect(html).not.toContain('Fire Watch Towers');
    });

    it('surfaces the selected map location for coordinate questions', async () => {
      localStorage.setItem('selectedLatitude', '10.5');
      localStorage.setItem('selectedLongitude', '76.5');
      localStorage.setItem('selectedLocation', 'Vellingiri Hills');
      await bootChatbot({ knowledge: CUSTOM_KNOWLEDGE });

      await ask('What is my selected location coordinates?');

      const html = lastMessageHtml();
      expect(html).toContain('Vellingiri Hills');
      expect(html).toContain('10.5');
      expect(html).toContain('76.5');
    });

    it('falls back to general documents when nothing matches the query', async () => {
      await bootChatbot({ knowledge: CUSTOM_KNOWLEDGE });

      await ask('zzzz quantum submarines');

      const html = lastMessageHtml();
      expect(html).toContain('Bamboo Groves');
      expect(html).not.toContain('Current Selected Location Metrics');
    });

    it('returns leading documents when the query is only stop words', async () => {
      await bootChatbot({ knowledge: CUSTOM_KNOWLEDGE });

      await ask('what is the');

      const html = lastMessageHtml();
      expect(html).toContain('Current Selected Location Metrics');
      expect(html).toContain('Bamboo Groves');
    });
  });

  describe('live Gemini mode', () => {
    function geminiResponse(text) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
      };
    }

    it('grounds the prompt in the retrieved documents and renders the reply', async () => {
      localStorage.setItem('gp_gemini_api_key', 'AIzaSy-live');
      const fetchMock = await bootChatbot({
        knowledge: CUSTOM_KNOWLEDGE,
        gemini: geminiResponse('**Bamboo** covers Sector A.'),
      });

      await ask('bamboo groves?');

      const [url, request] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(url).toContain('key=AIzaSy-live');
      expect(request.method).toBe('POST');
      const prompt = JSON.parse(request.body).contents[0].parts[0].text;
      expect(prompt).toContain('Bamboo groves cover the moist parts of Sector A.');
      expect(prompt).toContain('User Question: bamboo groves?');
      expect(lastMessageHtml()).toContain('<strong>Bamboo</strong>');
    });

    it('feeds earlier turns back as conversation history', async () => {
      localStorage.setItem('gp_gemini_api_key', 'AIzaSy-live');
      const fetchMock = await bootChatbot({
        knowledge: CUSTOM_KNOWLEDGE,
        gemini: geminiResponse('There are six towers.'),
      });

      await ask('how many fire towers?');
      await ask('and rain gauges?');

      const prompt = JSON.parse(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].body)
        .contents[0].parts[0].text;
      expect(prompt).toContain('User: how many fire towers?');
      expect(prompt).toContain('Assistant: There are six towers.');
    });

    it('reports API errors back to the user', async () => {
      localStorage.setItem('gp_gemini_api_key', 'AIzaSy-live');
      await bootChatbot({
        knowledge: CUSTOM_KNOWLEDGE,
        gemini: { ok: false, status: 403, json: async () => ({}) },
      });

      await ask('bamboo');

      const html = lastMessageHtml();
      expect(html).toContain('encountered an error');
      expect(html).toContain('API returned status 403');
      expect(document.querySelectorAll('.typing-indicator-msg')).toHaveLength(0);
    });

    it('reports malformed responses back to the user', async () => {
      localStorage.setItem('gp_gemini_api_key', 'AIzaSy-live');
      await bootChatbot({
        knowledge: CUSTOM_KNOWLEDGE,
        gemini: { ok: true, status: 200, json: async () => ({ promptFeedback: {} }) },
      });

      await ask('bamboo');

      expect(lastMessageHtml()).toContain('Invalid response format from Gemini API');
    });
  });

  describe('markdown rendering', () => {
    async function render(reply) {
      localStorage.setItem('gp_gemini_api_key', 'AIzaSy-live');
      await bootChatbot({
        knowledge: CUSTOM_KNOWLEDGE,
        gemini: {
          ok: true,
          status: 200,
          json: async () => ({ candidates: [{ content: { parts: [{ text: reply }] } }] }),
        },
      });
      await ask('bamboo');
      return lastMessageHtml();
    }

    it('escapes HTML so replies cannot inject markup', async () => {
      const html = await render('<img src=x onerror="alert(1)">');

      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });

    it('formats bold, italic and inline code', async () => {
      const html = await render('**bold** and *italic* and `code`');

      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('<code>code</code>');
    });

    it('converts newlines to line breaks', async () => {
      const html = await render('First line\nSecond line');

      expect(html).toBe('First line<br>Second line');
    });

    it('collapses dashed bullet lines into a single list', async () => {
      const html = await render('Species:\n- Teak\n- Rosewood');

      expect(html).toContain('<li>Teak</li>');
      expect(html).toContain('<li>Rosewood</li>');
      expect(html.match(/<ul>/g)).toHaveLength(1);
    });
  });
});
