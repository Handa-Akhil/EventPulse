import faqMarkdown from "../../docs/chatbot-faq.md?raw";
import knowledgeMarkdown from "../../docs/chatbot-knowledge.md?raw";

const DEFAULT_OUT_OF_SCOPE_RESPONSE =
  "Sorry, I cant help with that. I can only answer questions related to EventPulse.";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "when",
  "where",
  "which",
  "with",
  "you",
  "your",
]);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactMarkdownBody(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[-*]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .trim(),
    )
    .filter(Boolean)
    .join(" ");
}

function parseMarkdownSections(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const sections = [];
  let currentSection = null;

  lines.forEach((line) => {
    if (line.startsWith("## ")) {
      if (currentSection) {
        sections.push({
          heading: currentSection.heading,
          body: compactMarkdownBody(currentSection.body.join("\n")),
        });
      }

      currentSection = {
        heading: line.slice(3).trim(),
        body: [],
      };
      return;
    }

    if (currentSection) {
      currentSection.body.push(line);
    }
  });

  if (currentSection) {
    sections.push({
      heading: currentSection.heading,
      body: compactMarkdownBody(currentSection.body.join("\n")),
    });
  }

  return sections;
}

const FAQ_ALIASES = {
  "what is eventpulse": [
    "about eventpulse",
    "about this project",
    "what can eventpulse do",
    "what does this app do",
    "project overview",
    "features",
  ],
  "how do i sign up": ["signup", "sign up", "create account", "register"],
  "what happens after signup": [
    "after signup",
    "after sign up",
    "what happens after registration",
  ],
  "what preferences can i choose": [
    "preferences",
    "interests",
    "categories",
    "onboarding preferences",
  ],
  "how do i log in": ["login", "log in", "sign in"],
  "does eventpulse support google login": [
    "google login",
    "google sign in",
    "google auth",
  ],
  "what if google login says no account was found": [
    "no account found",
    "google login not working",
    "google account does not match",
  ],
  "how does forgot password work": [
    "forgot password",
    "password reset",
    "reset password",
    "otp",
  ],
  "how long is the password reset otp valid": [
    "otp valid",
    "otp expiry",
    "otp expires",
  ],
  "what can i do on the dashboard": [
    "dashboard",
    "what can i do",
    "dashboard features",
  ],
  "how are events personalized": [
    "recommendations",
    "recommended events",
    "personalized",
  ],
  "what range does eventpulse use for discovery": [
    "40 km",
    "range",
    "distance",
    "discovery range",
  ],
  "can i change my city manually": [
    "change city",
    "city dropdown",
    "manual city",
  ],
  "can i use my current device location": [
    "current location",
    "device location",
    "browser location",
  ],
  "what if location access is denied": [
    "location denied",
    "location permission",
    "location unavailable",
  ],
  "how do i find nearby events": [
    "nearby events",
    "find events",
    "search events",
    "available events",
  ],
  "what event views are available": [
    "grid view",
    "calendar view",
    "map view",
    "view mode",
  ],
  "what can i see on an event details page": [
    "event details",
    "event page",
    "event info",
    "event information",
  ],
  "how do i book an event": [
    "book event",
    "booking steps",
    "reserve ticket",
    "how to book",
  ],
  "can i book a sold out event": ["sold out", "book sold out"],
  "what happens after booking": [
    "after booking",
    "booking confirmation",
    "after payment",
  ],
  "where can i see my bookings": [
    "my bookings",
    "booking history",
    "recent bookings",
  ],
  "what does my tickets show": ["my tickets", "tickets page"],
  "does eventpulse support e tickets": [
    "e ticket",
    "eticket",
    "qr code",
  ],
  "can i review an event": ["review event", "rate event", "rating"],
  "can i review the same event twice": [
    "review twice",
    "same event twice",
    "multiple reviews",
  ],
  "how do notifications work": [
    "notifications",
    "notification bell",
    "alerts",
  ],
  "are notifications real time": [
    "real time notifications",
    "socket notifications",
  ],
  "can i mark all notifications as read": [
    "mark all read",
    "mark notifications read",
  ],
  "how do i create an event": [
    "create event",
    "submit event",
    "host event",
    "publish event",
  ],
  "what information is required to create an event": [
    "event form",
    "create event form",
    "required fields",
  ],
  "what categories are available in the create event form": [
    "create event categories",
    "event categories",
  ],
  "is a created event published immediately": [
    "published immediately",
    "event approval",
    "admin approval",
    "pending event",
  ],
  "does eventpulse have an admin panel": [
    "admin panel",
    "admin login",
    "moderation",
  ],
  "what should the chatbot say for unrelated questions": [
    "unrelated questions",
    "out of scope",
    "off topic",
  ],
};

const KNOWLEDGE_ALIASES = {
  "purpose": ["project purpose", "chatbot purpose", "scope"],
  "product summary": [
    "about eventpulse",
    "project summary",
    "app summary",
    "what is eventpulse",
  ],
  "supported topics": [
    "supported questions",
    "what can i ask",
    "allowed topics",
    "help topics",
  ],
  "authentication": [
    "auth",
    "login",
    "signup",
    "sign in",
    "sign up",
    "google login",
    "forgot password",
    "otp",
  ],
  "onboarding and preferences": [
    "onboarding",
    "preferences",
    "interests",
    "categories",
  ],
  "dashboard": [
    "dashboard",
    "search",
    "filter",
    "grid view",
    "calendar view",
    "map view",
  ],
  "location and range": [
    "location",
    "current city",
    "current location",
    "range",
    "40 km",
    "city dropdown",
  ],
  "recommended events": [
    "recommendations",
    "recommended",
    "personalized events",
  ],
  "nearby events": [
    "nearby events",
    "find events",
    "search events",
    "available events",
  ],
  "event details": [
    "event details",
    "event page",
    "event information",
    "showtimes",
    "price",
    "venue",
  ],
  "booking flow": [
    "booking",
    "book tickets",
    "reserve seats",
    "showtime",
    "quantity",
    "sold out",
  ],
  "my tickets": [
    "my tickets",
    "booking history",
    "ticket page",
    "bookings",
  ],
  "e ticket": ["e ticket", "eticket", "qr", "qr code"],
  "reviews and ratings": ["reviews", "review", "ratings", "rating", "stars"],
  "notifications": [
    "notifications",
    "notification bell",
    "alerts",
    "mark read",
    "mark all read",
    "real time",
  ],
  "create event": [
    "create event",
    "submit event",
    "host event",
    "publish event",
    "event form",
  ],
  "admin flow": [
    "admin",
    "admin panel",
    "admin login",
    "approval",
    "pending event",
  ],
  "response policy": ["scope", "policy", "supported answers"],
  "approved refusal reply": [
    "out of scope",
    "off topic",
    "unrelated question",
    "refusal",
  ],
};

function createFaqEntries(markdown) {
  return parseMarkdownSections(markdown)
    .filter((section) => /^\d+\./.test(section.heading))
    .map((section) => {
      const question = section.heading.replace(/^\d+\.\s*/, "").trim();
      const normalizedQuestion = normalizeText(question);

      return {
        question,
        answer: section.body,
        normalizedQuestion,
        aliases: FAQ_ALIASES[normalizedQuestion] ?? [],
      };
    });
}

function extractKnowledgeSection(markdown, heading) {
  const section = parseMarkdownSections(markdown).find(
    (entry) => normalizeText(entry.heading) === normalizeText(heading),
  );

  return section?.body || "";
}

function getMeaningfulTerms(text) {
  return normalizeText(text)
    .split(" ")
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

function scoreFaqEntry(normalizedMessage, entry) {
  const messageTerms = new Set(normalizedMessage.split(" ").filter(Boolean));
  const phrases = [entry.normalizedQuestion, ...entry.aliases.map(normalizeText)];
  let score = 0;

  phrases.forEach((phrase) => {
    if (!phrase) {
      return;
    }

    if (normalizedMessage === phrase) {
      score = Math.max(score, 120);
      return;
    }

    if (normalizedMessage.includes(phrase) || phrase.includes(normalizedMessage)) {
      score = Math.max(score, 90);
    }

    const phraseTerms = phrase.split(" ").filter((term) => term.length > 2);
    const overlap = phraseTerms.filter((term) => messageTerms.has(term)).length;

    if (overlap > 0) {
      score = Math.max(score, overlap * 18);
    }
  });

  return score;
}

function createKnowledgeEntries(markdown) {
  return parseMarkdownSections(markdown).map((section) => {
    const normalizedHeading = normalizeText(section.heading);
    const aliases = KNOWLEDGE_ALIASES[normalizedHeading] ?? [];

    return {
      heading: section.heading,
      body: section.body,
      normalizedHeading,
      aliases,
      bodyTerms: new Set(getMeaningfulTerms(section.body)),
    };
  });
}

function scoreKnowledgeEntry(normalizedMessage, entry) {
  const messageTerms = getMeaningfulTerms(normalizedMessage);
  const phraseCandidates = [
    entry.normalizedHeading,
    ...entry.aliases.map(normalizeText),
  ];
  let score = 0;

  phraseCandidates.forEach((phrase) => {
    if (!phrase) {
      return;
    }

    if (normalizedMessage === phrase) {
      score = Math.max(score, 120);
      return;
    }

    if (normalizedMessage.includes(phrase) || phrase.includes(normalizedMessage)) {
      score = Math.max(score, 95);
    }

    const phraseTerms = phrase
      .split(" ")
      .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
    const overlap = phraseTerms.filter((term) => messageTerms.includes(term)).length;

    if (overlap > 0) {
      score = Math.max(score, overlap * 20);
    }
  });

  const bodyOverlap = messageTerms.filter((term) => entry.bodyTerms.has(term)).length;

  if (bodyOverlap > 0) {
    score += bodyOverlap * 6;
  }

  if (messageTerms.length > 0 && bodyOverlap === messageTerms.length) {
    score += 12;
  }

  return score;
}

export const FAQ_ENTRIES = createFaqEntries(faqMarkdown);
export const KNOWLEDGE_SECTIONS = createKnowledgeEntries(knowledgeMarkdown);

export const PRODUCT_SUMMARY =
  extractKnowledgeSection(knowledgeMarkdown, "Product Summary") ||
  "EventPulse helps signed-in users discover and book events near them.";

export const OUT_OF_SCOPE_RESPONSE =
  extractKnowledgeSection(knowledgeMarkdown, "Approved Refusal Reply") ||
  DEFAULT_OUT_OF_SCOPE_RESPONSE;

export const SUPPORTED_TOPICS =
  extractKnowledgeSection(knowledgeMarkdown, "Supported Topics") || "";

export function findBestFaqMatch(message) {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  let bestMatch = null;

  FAQ_ENTRIES.forEach((entry) => {
    const score = scoreFaqEntry(normalizedMessage, entry);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { entry, score };
    }
  });

  if (!bestMatch || bestMatch.score < 24) {
    return null;
  }

  return bestMatch.entry;
}

export function findBestKnowledgeMatch(message) {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  let bestMatch = null;

  KNOWLEDGE_SECTIONS.forEach((entry) => {
    const score = scoreKnowledgeEntry(normalizedMessage, entry);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { entry, score };
    }
  });

  if (!bestMatch || bestMatch.score < 28) {
    return null;
  }

  return bestMatch.entry;
}

export function getFaqEntry(question) {
  const normalizedQuestion = normalizeText(question);

  return FAQ_ENTRIES.find(
    (entry) => entry.normalizedQuestion === normalizedQuestion,
  ) || null;
}

export { normalizeText };
