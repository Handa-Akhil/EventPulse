import { useEffect, useRef, useState } from "react";
import {
  FAQ_ENTRIES,
  OUT_OF_SCOPE_RESPONSE,
  PRODUCT_SUMMARY,
  findBestFaqMatch,
  findBestKnowledgeMatch,
  getFaqEntry,
  normalizeText,
} from "../data/chatbotKnowledge";
import "./Chatbot.css";

const DISCOVERY_CATEGORIES = [
  "Movies",
  "Comedy",
  "Sports",
  "Concerts",
  "Theatre",
  "Festivals",
];

function getFirstName(name) {
  const [firstName] = String(name || "").trim().split(/\s+/);
  return firstName || "there";
}

function includesPhrase(message, ...phrases) {
  return phrases.some((phrase) => message.includes(normalizeText(phrase)));
}

function uniqueEvents(items) {
  const seenIds = new Set();

  return items.filter((item) => {
    if (!item?.id || seenIds.has(item.id)) {
      return false;
    }

    seenIds.add(item.id);
    return true;
  });
}

function formatEventList(events, limit = 3) {
  return events
    .slice(0, limit)
    .map((event) => `${event.title} (${event.city})`)
    .join(", ");
}

function formatPreferences(preferences) {
  if (!preferences.length) {
    return "none saved yet";
  }

  return preferences.join(", ");
}

function findMatchingEvent(normalizedMessage, events) {
  const messageTerms = new Set(normalizedMessage.split(" ").filter(Boolean));

  return events.find((event) => {
    const normalizedTitle = normalizeText(event.title);

    if (!normalizedTitle) {
      return false;
    }

    if (normalizedMessage.includes(normalizedTitle)) {
      return true;
    }

    const titleTerms = normalizedTitle
      .split(" ")
      .filter((term) => term.length > 3);

    if (titleTerms.length === 0) {
      return false;
    }

    const overlap = titleTerms.filter((term) => messageTerms.has(term)).length;
    return overlap >= Math.min(2, titleTerms.length);
  });
}

function buildIntroMessage(currentUser) {
  return `Hi ${getFirstName(currentUser?.name)}, I answer only EventPulse questions. ${PRODUCT_SUMMARY}`;
}

function buildWelcomeMessage(currentUser, welcomeIntent) {
  const firstName = getFirstName(currentUser?.name);

  if (welcomeIntent?.type === "signup") {
    return `Welcome to EventPulse, ${firstName}. I am using your EventPulse knowledge files, so ask me about onboarding, events, bookings, tickets, or event creation.`;
  }

  if (welcomeIntent?.type === "google") {
    return `Welcome back, ${firstName}. Your Google sign-in worked. Ask me any EventPulse question from the project knowledge base.`;
  }

  return `Welcome back, ${firstName}. I can answer only EventPulse questions using the project FAQ and knowledge base.`;
}

function buildFaqBackedResponse(faqEntry, context) {
  const locationLabel =
    context.location?.label || context.location?.city || "your selected city";
  const preferences = context.currentUser?.preferences ?? [];
  const recommendedEvents = context.recommendedEvents ?? [];
  const recentBookings = context.recentBookings ?? [];

  if (!faqEntry) {
    return null;
  }

  switch (faqEntry.normalizedQuestion) {
    case normalizeText("What preferences can I choose"):
      return `${faqEntry.answer} Your current saved preferences are ${formatPreferences(preferences)}.`;

    case normalizeText("How are events personalized"):
      if (recommendedEvents.length > 0) {
        return `${faqEntry.answer} Right now I can see ${recommendedEvents.length} recommendation(s) near ${locationLabel}, including ${formatEventList(recommendedEvents)}.`;
      }

      return faqEntry.answer;

    case normalizeText("What range does EventPulse use for discovery"):
    case normalizeText("Can I change my city manually"):
    case normalizeText("Can I use my current device location"):
    case normalizeText("What if location access is denied"):
      return `${faqEntry.answer} Your current EventPulse location is ${locationLabel}.`;

    case normalizeText("Where can I see my bookings"):
    case normalizeText("What does My Tickets show"):
      if (recentBookings.length > 0) {
        const [latestBooking] = recentBookings;
        return `${faqEntry.answer} Your latest booking is ${latestBooking.title} on ${latestBooking.dateLabel} at ${latestBooking.slot}.`;
      }

      return faqEntry.answer;

    default:
      return faqEntry.answer;
  }
}

function buildKnowledgeBackedResponse(knowledgeEntry, context) {
  const locationLabel =
    context.location?.label || context.location?.city || "your selected city";
  const recommendedEvents = context.recommendedEvents ?? [];
  const nearbyEvents = context.nearbyEvents ?? [];
  const recentBookings = context.recentBookings ?? [];

  if (!knowledgeEntry) {
    return null;
  }

  switch (knowledgeEntry.normalizedHeading) {
    case normalizeText("Recommended Events"):
      if (recommendedEvents.length > 0) {
        return `${knowledgeEntry.body} Right now I can see ${recommendedEvents.length} recommendation(s) near ${locationLabel}, including ${formatEventList(recommendedEvents)}.`;
      }

      return knowledgeEntry.body;

    case normalizeText("Nearby Events"):
      if (nearbyEvents.length > 0) {
        return `${knowledgeEntry.body} At the moment, your dashboard shows ${nearbyEvents.length} nearby event(s) around ${locationLabel}.`;
      }

      return knowledgeEntry.body;

    case normalizeText("My Tickets"):
      if (recentBookings.length > 0) {
        const [latestBooking] = recentBookings;
        return `${knowledgeEntry.body} Your latest booking is ${latestBooking.title} on ${latestBooking.dateLabel} at ${latestBooking.slot}.`;
      }

      return knowledgeEntry.body;

    case normalizeText("Location and Range"):
      return `${knowledgeEntry.body} Your current EventPulse location is ${locationLabel}.`;

    default:
      return knowledgeEntry.body;
  }
}

function buildAssistantResponse(message, context) {
  const normalizedMessage = normalizeText(message);
  const messageWords = new Set(normalizedMessage.split(" ").filter(Boolean));
  const locationLabel =
    context.location?.label || context.location?.city || "your selected city";
  const recommendedEvents = context.recommendedEvents ?? [];
  const nearbyEvents = context.nearbyEvents ?? [];
  const recentBookings = context.recentBookings ?? [];
  const activeCategory = context.activeCategory || "All";
  const allEvents = uniqueEvents([...recommendedEvents, ...nearbyEvents]);
  const matchingEvent = findMatchingEvent(normalizedMessage, allEvents);
  const requestedDiscoveryCategory = DISCOVERY_CATEGORIES.find((category) =>
    normalizedMessage.includes(normalizeText(category)),
  );

  if (!normalizedMessage) {
    return OUT_OF_SCOPE_RESPONSE;
  }

  if (messageWords.has("hello") || messageWords.has("hi") || messageWords.has("hey")) {
    return `Hello ${getFirstName(context.currentUser?.name)}. I can help only with EventPulse. Ask about login, signup, events, bookings, tickets, notifications, reviews, or event creation.`;
  }

  if (includesPhrase(normalizedMessage, "what can you do", "help", "what can i ask")) {
    return "I can answer EventPulse questions from the project FAQ and knowledge base, including authentication, onboarding, preferences, events, bookings, tickets, notifications, reviews, location, and create-event flow.";
  }

  if (includesPhrase(normalizedMessage, "account", "profile", "email", "logout", "sign out")) {
    return `You are signed in to EventPulse as ${context.currentUser?.email}. The dashboard header shows your account info, and the logout button is available in the top-right user area.`;
  }

  if (includesPhrase(normalizedMessage, "recommend", "suggest", "recommended", "best for me")) {
    if (recommendedEvents.length > 0) {
      return `Based on your current dashboard data, I can see ${recommendedEvents.length} recommendation(s) near ${locationLabel}. Top picks are ${formatEventList(recommendedEvents)}.`;
    }

    const faqEntry = getFaqEntry("How are events personalized");
    return faqEntry?.answer || OUT_OF_SCOPE_RESPONSE;
  }

  if (requestedDiscoveryCategory) {
    const categoryEvents = allEvents.filter(
      (event) => normalizeText(event.category) === normalizeText(requestedDiscoveryCategory),
    );

    if (categoryEvents.length > 0) {
      return `For ${requestedDiscoveryCategory}, I found ${categoryEvents.length} event(s) near ${locationLabel}. Some options are ${formatEventList(categoryEvents)}.`;
    }

    return `I do not see any ${requestedDiscoveryCategory.toLowerCase()} events in the current EventPulse results. Try changing the city, search text, or dashboard filter chips.`;
  }

  if (
    includesPhrase(
      normalizedMessage,
      "nearby events",
      "show events",
      "available events",
      "find events",
      "search events",
      "dashboard",
      "grid",
      "calendar",
      "map",
      "view mode",
      "filter",
    )
  ) {
    if (nearbyEvents.length > 0) {
      return `The dashboard currently has ${nearbyEvents.length} nearby event(s) around ${locationLabel} with the ${activeCategory} filter selected. You can browse them in grid, calendar, or map view, and search by event, venue, city, or category.`;
    }
  }

  if (
    matchingEvent &&
    includesPhrase(
      normalizedMessage,
      "about",
      "details",
      "tell me about",
      "price",
      "venue",
      "when",
      "event",
    )
  ) {
    const seatMessage =
      typeof matchingEvent.seatsLeft === "number"
        ? matchingEvent.seatsLeft > 0
          ? `${matchingEvent.seatsLeft} seats are left.`
          : "It is currently sold out."
        : "Seat availability is not shown right now.";

    return `${matchingEvent.title} is a ${matchingEvent.category} event in ${matchingEvent.city} at ${matchingEvent.venue}. It is scheduled for ${matchingEvent.dateLabel}, priced at Rs. ${matchingEvent.price}. ${seatMessage} Open View details on the card to continue.`;
  }

  if (
    includesPhrase(
      normalizedMessage,
      "my bookings",
      "recent bookings",
      "booked events",
      "booking history",
    )
  ) {
    if (recentBookings.length === 0) {
      const faqEntry = getFaqEntry("Where can I see my bookings");
      return faqEntry?.answer || OUT_OF_SCOPE_RESPONSE;
    }

    const [latestBooking] = recentBookings;

    return `Your latest booking is ${latestBooking.title} on ${latestBooking.dateLabel} at ${latestBooking.slot}. The My Tickets page shows the full booking history and e-ticket access.`;
  }

  if (includesPhrase(normalizedMessage, "ticket", "tickets", "my tickets", "e ticket", "qr")) {
    const faqEntry = getFaqEntry("What does My Tickets show");

    if (recentBookings.length > 0 && faqEntry) {
      const [latestBooking] = recentBookings;
      return `${faqEntry.answer} Your latest booking is ${latestBooking.title} on ${latestBooking.dateLabel} at ${latestBooking.slot}.`;
    }

    return faqEntry?.answer || OUT_OF_SCOPE_RESPONSE;
  }

  if (
    includesPhrase(
      normalizedMessage,
      "location",
      "current city",
      "my city",
      "where am i",
      "distance",
      "range",
      "40 km",
      "use current location",
    )
  ) {
    return `EventPulse is currently using ${locationLabel} for this signed-in session. Discovery stays within 40 km, and users can switch cities manually or use the current-location button when location access is allowed.`;
  }

  const faqEntry = findBestFaqMatch(message);

  if (faqEntry) {
    return buildFaqBackedResponse(faqEntry, context);
  }

  const knowledgeEntry = findBestKnowledgeMatch(message);

  if (knowledgeEntry) {
    return buildKnowledgeBackedResponse(knowledgeEntry, context);
  }

  return OUT_OF_SCOPE_RESPONSE;
}

export default function Chatbot({
  activeCategory,
  currentUser,
  isPreferenceOpen = false,
  location,
  nearbyEvents = [],
  onWelcomeShown,
  recentBookings = [],
  recommendedEvents = [],
  welcomeIntent,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: "intro",
      sender: "bot",
      text: buildIntroMessage(currentUser),
    },
  ]);
  const [input, setInput] = useState("");
  const messageIdRef = useRef(1);
  const shownWelcomeStampRef = useRef(null);
  const messagesRef = useRef(null);

  const quickPrompts = [
    {
      label: "Overview",
      prompt: getFaqEntry("What is EventPulse?")?.question || "What is EventPulse?",
    },
    {
      label: "Booking flow",
      prompt: getFaqEntry("How do I book an event?")?.question || "How do I book an event?",
    },
    {
      label: "Tickets",
      prompt: getFaqEntry("What does My Tickets show")?.question || "What does My Tickets show?",
    },
    {
      label: "Notifications",
      prompt:
        getFaqEntry("How do notifications work?")?.question ||
        "How do notifications work?",
    },
    {
      label: "Create event",
      prompt: getFaqEntry("How do I create an event?")?.question || "How do I create an event?",
    },
  ];

  useEffect(() => {
    setMessages([
      {
        id: "intro",
        sender: "bot",
        text: buildIntroMessage(currentUser),
      },
    ]);
    setInput("");
    shownWelcomeStampRef.current = null;
  }, [currentUser?.id]);

  useEffect(() => {
    if (!messagesRef.current) {
      return;
    }

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [isOpen, messages]);

  useEffect(() => {
    const isOnboardingPending = Boolean(currentUser && !currentUser.hasOnboarded);

    if (!welcomeIntent?.stamp || isPreferenceOpen || isOnboardingPending) {
      return;
    }

    if (shownWelcomeStampRef.current === welcomeIntent.stamp) {
      return;
    }

    shownWelcomeStampRef.current = welcomeIntent.stamp;
    setIsOpen(true);
    setMessages((current) => [
      ...current,
      {
        id: `welcome-${welcomeIntent.stamp}`,
        sender: "bot",
        text: buildWelcomeMessage(currentUser, welcomeIntent),
      },
    ]);
    onWelcomeShown?.();
  }, [currentUser, isPreferenceOpen, onWelcomeShown, welcomeIntent]);

  const appendConversation = (prompt) => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const response = buildAssistantResponse(trimmedPrompt, {
      activeCategory,
      currentUser,
      location,
      nearbyEvents,
      recentBookings,
      recommendedEvents,
    });

    const userId = `user-${messageIdRef.current++}`;
    const botId = `bot-${messageIdRef.current++}`;

    setMessages((current) => [
      ...current,
      {
        id: userId,
        sender: "user",
        text: trimmedPrompt,
      },
      {
        id: botId,
        sender: "bot",
        text: response,
      },
    ]);
  };

  const handleSend = () => {
    appendConversation(input);
    setInput("");
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleSend();
  };

  return (
    <div className="chatbot">
      {isOpen ? (
        <section className="chatbot__window" aria-label="EventPulse assistant">
          <header className="chatbot__header">
            <div className="chatbot__header-copy">
              <span className="chatbot__eyebrow">Knowledge-trained assistant</span>
              <h3>EventPulse Assistant</h3>
              <p>Answers from the project FAQ and EventPulse knowledge files.</p>
            </div>
            <button
              aria-label="Close assistant"
              className="chatbot__close"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Close
            </button>
          </header>

          <div className="chatbot__messages" ref={messagesRef} role="log">
            {messages.map((message) => (
              <div
                className={
                  message.sender === "user"
                    ? "chatbot__bubble chatbot__bubble--user"
                    : "chatbot__bubble chatbot__bubble--bot"
                }
                key={message.id}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="chatbot__prompts">
            {quickPrompts.map((prompt) => (
              <button
                className="chatbot__prompt"
                key={prompt.label}
                onClick={() => appendConversation(prompt.prompt)}
                type="button"
              >
                {prompt.label}
              </button>
            ))}
          </div>

          <div className="chatbot__composer">
            <input
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask from ${FAQ_ENTRIES.length} EventPulse FAQ topics...`}
              type="text"
              value={input}
            />
            <button
              className="button button--primary chatbot__send"
              disabled={!input.trim()}
              onClick={handleSend}
              type="button"
            >
              Send
            </button>
          </div>
        </section>
      ) : null}

      <button
        aria-expanded={isOpen}
        aria-label="Open EventPulse assistant"
        className="chatbot__toggle"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="chatbot__toggle-mark">EP</span>
        <span className="chatbot__toggle-copy">
          <strong>Ask EventPulse</strong>
          <small>FAQ-trained help</small>
        </span>
      </button>
    </div>
  );
}
