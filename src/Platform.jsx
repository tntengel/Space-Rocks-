import React, { useState, useRef, useEffect } from "react";
import { signUpWithEmail, loadUserProfile, subscribeToAuthChanges, signOut } from "./lib/auth";

// ---------- mock data ----------

const seedChannels = [
  {
    id: "c1",
    name: "Amara Osei",
    handle: "@amara",
    tagline: "Street food & city life, Accra",
    avatarUrl: null,
    bannerUrl: null,
    followers: 4200,
    plan: "creator",
    superfanPrice: 4.99,
    superfans: ["@rosam"],
    tips: [
      { id: "t1", from: "@devnair", amount: 5, message: "Loved the market tour!", time: "3 days ago" },
    ],
    posts: [
      { id: "p1", type: "poll", question: "What should I film next?", options: [
        { text: "Street breakfast tour", votes: 41 },
        { text: "Late-night market crawl", votes: 68 },
      ], voted: null, time: "2 days ago" },
    ],
    videos: [
      { id: "v1", title: "Late-night jollof stalls near Osu", views: 12000, time: "2 days ago", durationSec: 312, filter: "none", avgRating: 4.6, ratingCount: 340, criticAvgRating: 4.7, criticRatingCount: 12, myRating: null, starCount: 230, planetCount: 60, blackholeCount: 13, myReaction: null, comments: [
        { id: "cm1", author: "@rosam", text: "This looks incredible, need to try this spot!", time: "1 day ago" },
      ] },
      { id: "v2", title: "What $5 buys at Makola Market", views: 34000, time: "1 week ago", durationSec: 540, filter: "none", avgRating: 4.8, ratingCount: 812, criticAvgRating: 4.9, criticRatingCount: 26, myRating: null, starCount: 610, planetCount: 91, blackholeCount: 22, myReaction: null, comments: [] },
    ],
  },
  {
    id: "c2",
    name: "Dev Nair",
    handle: "@devnair",
    tagline: "Independent commentary, unfiltered",
    avatarUrl: null,
    bannerUrl: null,
    followers: 1800,
    plan: "free",
    superfanPrice: null,
    superfans: [],
    tips: [],
    posts: [],
    videos: [
      { id: "v3", title: "Why nobody covers this story", views: 8100, time: "5 hours ago", durationSec: 480, filter: "none", avgRating: 3.9, ratingCount: 156, criticAvgRating: 0, criticRatingCount: 0, myRating: null, starCount: 20, planetCount: 41, blackholeCount: 88, myReaction: null, comments: [
        { id: "cm2", author: "@amara", text: "Finally someone said it.", time: "3 hours ago" },
      ] },
    ],
  },
  {
    id: "c3",
    name: "Rosa Mendes",
    handle: "@rosam",
    tagline: "Home repairs, no nonsense",
    avatarUrl: null,
    bannerUrl: null,
    followers: 9600,
    plan: "pro",
    superfanPrice: 7.99,
    superfans: ["@amara", "@devnair"],
    tips: [
      { id: "t2", from: "@amara", amount: 10, message: "This saved my weekend, thank you!", time: "1 week ago" },
      { id: "t3", from: "@devnair", amount: 3, message: "", time: "3 weeks ago" },
    ],
    posts: [],
    videos: [
      { id: "v4", title: "Fixing a leaking tap in 4 minutes", views: 91000, time: "3 weeks ago", durationSec: 258, filter: "none", avgRating: 4.9, ratingCount: 2100, criticAvgRating: 4.6, criticRatingCount: 34, myRating: null, starCount: 1690, planetCount: 150, blackholeCount: 51, myReaction: null, comments: [
        { id: "cm3", author: "@devnair", text: "Saved me a call-out fee, thank you!", time: "2 weeks ago" },
        { id: "cm4", author: "@amara", text: "Glad it helped!", time: "2 weeks ago" },
      ] },
      { id: "v5", title: "Tools I actually use", views: 22000, time: "1 month ago", durationSec: 645, filter: "none", avgRating: 4.4, ratingCount: 430, criticAvgRating: 0, criticRatingCount: 0, myRating: null, starCount: 340, planetCount: 62, blackholeCount: 19, myReaction: null, comments: [] },
    ],
  },
];

const FILTERS = {
  none: { label: "None", css: "none" },
  bw: { label: "B&W", css: "grayscale(1)" },
  warm: { label: "Warm", css: "sepia(0.35) saturate(1.3) brightness(1.05)" },
  cool: { label: "Cool", css: "hue-rotate(180deg) saturate(1.15)" },
  vintage: { label: "Vintage", css: "sepia(0.5) contrast(0.9) brightness(0.95)" },
  contrast: { label: "High Contrast", css: "contrast(1.4) saturate(1.2)" },
};

const PLANS = {
  free: { id: "free", label: "Free", price: 0, maxLen: 600, maxLibrary: 3600, maxQuality: "720p", qualityRank: 1 },
  creator: { id: "creator", label: "Creator", price: 6.99, maxLen: 1800, maxLibrary: 18000, maxQuality: "1080p", qualityRank: 2 },
  pro: { id: "pro", label: "Pro Creator", price: 17.99, maxLen: Infinity, maxLibrary: Infinity, maxQuality: "4K", qualityRank: 3 },
};
const QUALITY_OPTIONS = [
  { id: "480p", rank: 0 },
  { id: "720p", rank: 1 },
  { id: "1080p", rank: 2 },
  { id: "4K", rank: 3 },
];

const VIEWER_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// A video's tone: Star (bright), Planet (in-between), Black Hole (dark) —
// mutually exclusive per viewer, like/dislike's bolder cousin.
const TONE_COUNT_FIELD = { star: "starCount", planet: "planetCount", blackhole: "blackholeCount" };

function formatDuration(sec) {
  if (!sec || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCount(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function HeartIcon({ filled, color, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartRow({ value, color, size = 14, gap = 2 }) {
  const filled = Math.round(value);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <HeartIcon key={n} filled={n <= filled} color={color} size={size} />
      ))}
    </span>
  );
}

function StarIcon({ filled, color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path
        d="M12 2 L14.59 8.36 L21.51 9.27 L16.26 13.97 L17.77 20.78 L12 17.27 L6.23 20.78 L7.74 13.97 L2.49 9.27 L9.41 8.36 Z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanetIcon({ filled, color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <ellipse cx="12" cy="13" rx="9.5" ry="3.2" fill="none" stroke={color} strokeWidth="1.4" transform="rotate(-15 12 13)" />
      <circle cx="12" cy="11.5" r="5" fill={filled ? color : "none"} stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function BlackHoleIcon({ filled, color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <ellipse cx="12" cy="12" rx="10.5" ry="4" fill="none" stroke={color} strokeWidth="1.4" transform="rotate(-8 12 12)" />
      <circle cx="12" cy="12" r="5" fill={filled ? color : "none"} stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function calcAge(birthdateStr) {
  const b = new Date(birthdateStr);
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

const MOD_STEPS = [
  "Scanning against known-illegal-content hash lists…",
  "Checking copyright reference database…",
  "Clear. Publishing to your channel…",
];

// ---------- the header logo: a globe with a house (and a V) inside it ----------

function WorldMark({ size = 40 }) {
  const uid = `whv-clip-${size}`;
  const orbit = size >= 30;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <clipPath id={uid}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill="#1F4C5C" />
        <g clipPath={`url(#${uid})`}>
          <ellipse cx="26" cy="34" rx="17" ry="11" fill="#4FA391" opacity="0.85" transform="rotate(-18 26 34)" />
          <ellipse cx="72" cy="62" rx="20" ry="13" fill="#4FA391" opacity="0.85" transform="rotate(12 72 62)" />
          <ellipse cx="46" cy="86" rx="16" ry="8" fill="#4FA391" opacity="0.7" />
        </g>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#0F2E38" strokeWidth="2" />
        <polygon points="50,28 25,50 75,50" fill="#E8A33D" stroke="#A9691F" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="31" y="50" width="38" height="27" fill="#F5EEDD" stroke="#A9691F" strokeWidth="1.5" />
        <text x="50" y="70" textAnchor="middle" fontFamily="'Fredoka', sans-serif" fontWeight="700" fontSize="17" fill="#E8483B">
          TV
        </text>
      </svg>
      {orbit && (
        <div style={{ position: "absolute", inset: 0, animation: "whv-orbit 7s linear infinite" }}>
          <span
            style={{
              position: "absolute",
              top: -1,
              left: "50%",
              width: size * 0.09,
              height: size * 0.09,
              borderRadius: "50%",
              background: "#E8483B",
              transform: "translateX(-50%)",
              boxShadow: "0 0 4px #E8483B",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------- the main-page mark: a little TV with HPTV glowing on the screen ----------

function TVMark({ size = 40, label = "HPTV", rec = true }) {
  const bodyH = size;
  const bodyW = size * 1.2;
  return (
    <div style={{ position: "relative", width: bodyW, height: bodyH + size * 0.28 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: bodyW * 0.5 - 1,
          width: 2,
          height: size * 0.22,
          background: "#8C5A3B",
          transform: "rotate(-22deg)",
          transformOrigin: "bottom center",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: bodyW * 0.5 - 1,
          width: 2,
          height: size * 0.22,
          background: "#8C5A3B",
          transform: "rotate(22deg)",
          transformOrigin: "bottom center",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: size * 0.2,
          width: bodyW,
          height: bodyH,
          background: "linear-gradient(155deg, #E8A33D, #C97A2B)",
          borderRadius: size * 0.16,
          padding: size * 0.1,
          boxShadow: "0 2px 0 rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: "#1F4C5C",
            borderRadius: size * 0.09,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 600,
              fontSize: size * 0.27,
              color: "#F5EEDD",
              letterSpacing: "0.02em",
              zIndex: 1,
            }}
          >
            {label}
          </span>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
              opacity: 0.5,
            }}
          />
          {rec && (
            <span
              style={{
                position: "absolute",
                top: "12%",
                right: "10%",
                width: size * 0.08,
                height: size * 0.08,
                borderRadius: "50%",
                background: "#E8483B",
                animation: "whv-blink 1.4s infinite",
              }}
            />
          )}
        </div>
        <span
          style={{
            position: "absolute",
            right: size * 0.09,
            bottom: size * 0.08,
            width: size * 0.09,
            height: size * 0.09,
            borderRadius: "50%",
            background: "#A9691F",
          }}
        />
      </div>
    </div>
  );
}

// ---------- component ----------

export default function Platform() {
  const [view, setView] = useState("landing");
  const [channels, setChannels] = useState(seedChannels);
  const [user, setUser] = useState(null);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSignup, setShowSignup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCriticUpgrade, setShowCriticUpgrade] = useState(false);
  const [showPlatformSupport, setShowPlatformSupport] = useState(false);
  const [tipTarget, setTipTarget] = useState(null); // channelId, or null when the tip modal is closed
  const [superfanTarget, setSuperfanTarget] = useState(null); // channelId, or null when the superfan modal is closed
  const [reportPrefill, setReportPrefill] = useState(null);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupBirthdate, setSignupBirthdate] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupStage, setSignupStage] = useState("form"); // "form" | "sending" | "sent"
  const [activeThreadChannelId, setActiveThreadChannelId] = useState(null);

  // Real Supabase session -> app user. Fires once on mount with any
  // existing session, then again after the magic-link redirect signs
  // the browser in (or on sign-out). Fields with no backend table yet
  // (isCritic, conversations, supportRequests) default to empty/local.
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (authUser) => {
      if (!authUser) {
        setUser(null);
        return;
      }
      try {
        const profile = await loadUserProfile(authUser.id);
        setUser({ ...profile, isCritic: false, conversations: [], supportRequests: [], superfanOf: [] });
        setShowSignup(false);
        setSignupStage("form");
        // The feed/channel data is still a local mock array (see
        // docs/build-brief.md) rather than a Supabase query, so a
        // freshly-created real account has no matching entry in it yet.
        // Stub one in from the profile so the dashboard/upload flow has
        // somewhere to write to until that data is wired up for real.
        setChannels((cs) =>
          cs.some((c) => c.id === profile.channelId)
            ? cs
            : [
                { id: profile.channelId, name: profile.name, handle: profile.handle, tagline: "New voice on Home Planet TV", videos: [], posts: [], tips: [], superfans: [], superfanPrice: null, avatarUrl: null, bannerUrl: null, plan: "free", followers: 0 },
                ...cs,
              ]
        );
      } catch (err) {
        console.error("Failed to load user profile", err);
      }
    });
    return unsubscribe;
  }, []);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeVideo = activeChannel?.videos.find((v) => v.id === activeVideoId);
  const activeThread = user?.conversations?.find((c) => c.channelId === activeThreadChannelId);
  const unreadCount = user?.notifications?.filter((n) => !n.read).length || 0;

  const openVideo = (channelId, videoId) => {
    setActiveChannelId(channelId);
    setActiveVideoId(videoId);
    setView("watch");
  };

  const pushNotification = (text) => {
    setUser((u) => (u ? { ...u, notifications: [{ id: "n" + Date.now(), text, time: "just now", read: false }, ...(u.notifications || [])] } : u));
  };

  const toggleNotifications = () => {
    setShowNotifications((s) => !s);
    if (!showNotifications) {
      setUser((u) => (u ? { ...u, notifications: (u.notifications || []).map((n) => ({ ...n, read: true })) } : u));
    }
  };

  const closeNotifications = () => setShowNotifications(false);

  const toggleFollow = (channelId) => {
    if (!user) return;
    const isFollowing = (user.following || []).includes(channelId);
    setUser((u) => ({ ...u, following: isFollowing ? u.following.filter((id) => id !== channelId) : [...(u.following || []), channelId] }));
    setChannels((cs) => cs.map((c) => (c.id === channelId ? { ...c, followers: (c.followers || 0) + (isFollowing ? -1 : 1) } : c)));
  };

  const sendTip = (channelId, amount, message) => {
    if (!user || !(amount > 0)) return;
    setChannels((cs) =>
      cs.map((c) =>
        c.id !== channelId
          ? c
          : { ...c, tips: [{ id: "t" + Date.now(), from: user.handle, amount, message: message.trim(), time: "just now" }, ...(c.tips || [])] }
      )
    );
  };

  const toggleSuperfan = (channelId) => {
    if (!user) return;
    const isSuperfan = (user.superfanOf || []).includes(channelId);
    setUser((u) => ({ ...u, superfanOf: isSuperfan ? u.superfanOf.filter((id) => id !== channelId) : [...(u.superfanOf || []), channelId] }));
    setChannels((cs) =>
      cs.map((c) =>
        c.id !== channelId
          ? c
          : { ...c, superfans: isSuperfan ? (c.superfans || []).filter((h) => h !== user.handle) : [...(c.superfans || []), user.handle] }
      )
    );
  };

  const supportPlatform = (amount) => {
    if (!user || !(amount > 0)) return;
    pushNotification(`Thanks for supporting Home Planet TV with a $${amount} donation!`);
  };

  const REPLY_LINES = [
    "Hey! Thanks for reaching out.",
    "Appreciate you watching — what's up?",
    "Good to hear from you!",
    "On it, give me a bit to get back to you properly.",
  ];

  const sendMessage = (channelId, text) => {
    if (!text.trim() || !user) return;
    const outgoing = { id: "m" + Date.now(), from: "me", text: text.trim(), time: "just now" };
    setUser((u) => {
      const existing = (u.conversations || []).find((c) => c.channelId === channelId);
      const conversations = existing
        ? u.conversations.map((c) => (c.channelId === channelId ? { ...c, messages: [...c.messages, outgoing] } : c))
        : [...(u.conversations || []), { channelId, messages: [outgoing] }];
      return { ...u, conversations };
    });

    const channelName = channels.find((c) => c.id === channelId)?.name || "They";
    setTimeout(() => {
      const reply = { id: "m" + Date.now(), from: "them", text: REPLY_LINES[Math.floor(Math.random() * REPLY_LINES.length)], time: "just now" };
      setUser((u) => (u ? { ...u, conversations: (u.conversations || []).map((c) => (c.channelId === channelId ? { ...c, messages: [...c.messages, reply] } : c)) } : u));
      pushNotification(`${channelName} replied to your message`);
    }, 2500);
  };

  const votePoll = (channelId, postId, optionIndex) => {
    setChannels((cs) =>
      cs.map((c) =>
        c.id !== channelId
          ? c
          : {
              ...c,
              posts: (c.posts || []).map((p) =>
                p.id !== postId || p.voted !== null
                  ? p
                  : { ...p, voted: optionIndex, options: p.options.map((o, i) => (i === optionIndex ? { ...o, votes: o.votes + 1 } : o)) }
              ),
            }
      )
    );
  };

  const createPost = (channelId, post) => {
    setChannels((cs) => cs.map((c) => (c.id === channelId ? { ...c, posts: [{ ...post, id: "p" + Date.now(), time: "just now" }, ...(c.posts || [])] } : c)));
  };

  const rateVideo = (channelId, videoId, rating) => {
    setChannels((cs) =>
      cs.map((c) =>
        c.id !== channelId
          ? c
          : {
              ...c,
              videos: c.videos.map((v) => {
                if (v.id !== videoId) return v;
                const count = v.ratingCount || 0;
                const avg = v.avgRating || 0;
                let next;
                if (v.myRating != null) {
                  const newAvg = count > 0 ? (avg * count - v.myRating + rating) / count : rating;
                  next = { ...v, avgRating: newAvg, myRating: rating };
                } else {
                  const newCount = count + 1;
                  const newAvg = (avg * count + rating) / newCount;
                  next = { ...v, avgRating: newAvg, ratingCount: newCount, myRating: rating };
                }
                // Verified Critics also feed a separate critic-only score, on top of the community rating
                if (user?.isCritic && v.myRating == null) {
                  const cCount = (v.criticRatingCount || 0) + 1;
                  const cAvg = ((v.criticAvgRating || 0) * (v.criticRatingCount || 0) + rating) / cCount;
                  next = { ...next, criticAvgRating: cAvg, criticRatingCount: cCount };
                }
                return next;
              }),
            }
      )
    );
  };

  const setTone = (channelId, videoId, choice) => {
    if (!user) return;
    setChannels((cs) =>
      cs.map((c) =>
        c.id !== channelId
          ? c
          : {
              ...c,
              videos: c.videos.map((v) => {
                if (v.id !== videoId) return v;
                const next = { ...v };
                // clear whatever this viewer had previously picked, if anything
                if (v.myReaction) {
                  const prevField = TONE_COUNT_FIELD[v.myReaction];
                  next[prevField] = (next[prevField] || 0) - 1;
                }
                if (v.myReaction === choice) {
                  // clicking the already-selected option again clears it
                  next.myReaction = null;
                } else {
                  next.myReaction = choice;
                  const field = TONE_COUNT_FIELD[choice];
                  next[field] = (next[field] || 0) + 1;
                }
                return next;
              }),
            }
      )
    );
  };

  const upgradeToCritic = () => {
    setUser((u) => (u ? { ...u, isCritic: true } : u));
  };

  const changeChannelPlan = (planId) => {
    if (!user) return;
    setChannels((cs) => cs.map((c) => (c.id === user.channelId ? { ...c, plan: planId } : c)));
    pushNotification(`Your channel is now on the ${PLANS[planId].label} plan.`);
  };

  const submitSupportRequest = (type, subject, details) => {
    if (!user) return;
    const id = "req" + Date.now();
    setUser((u) => (u ? { ...u, supportRequests: [{ id, type, subject, details, status: "Under review", time: "just now" }, ...(u.supportRequests || [])] } : u));
    const label = type === "appeal" ? "appeal" : type === "report" ? "report" : "support request";
    pushNotification(`We received your ${label} — reference #${id.slice(-6).toUpperCase()}`);
  };

  const exportUserData = () => {
    if (!user) return;
    const channel = channels.find((c) => c.id === user.channelId);
    const data = {
      account: { name: user.name, handle: user.handle, email: user.email, isAdult: user.isAdult, isCritic: !!user.isCritic },
      channel: channel ? { name: channel.name, handle: channel.handle, tagline: channel.tagline, followers: channel.followers } : null,
      videos: (channel?.videos || []).map((v) => ({ title: v.title, views: v.views, avgRating: v.avgRating, ratingCount: v.ratingCount, time: v.time })),
      following: user.following || [],
      supportRequests: user.supportRequests || [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `home-planet-tv-data-${user.handle.replace("@", "")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteAccount = () => {
    if (!user) return;
    setChannels((cs) => cs.filter((c) => c.id !== user.channelId));
    setUser(null);
    setView("landing");
  };

  const addComment = (channelId, videoId, text) => {
    if (!text.trim()) return;
    setChannels((cs) =>
      cs.map((c) =>
        c.id !== channelId
          ? c
          : {
              ...c,
              videos: c.videos.map((v) =>
                v.id !== videoId
                  ? v
                  : {
                      ...v,
                      comments: [...(v.comments || []), { id: "cm" + Date.now(), author: user?.handle || "Guest", text: text.trim(), time: "just now" }],
                    }
              ),
            }
      )
    );
  };

  const handleSignup = async () => {
    if (!signupName.trim()) { setSignupError("Enter a name for your channel."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail.trim())) { setSignupError("Enter a valid email address."); return; }
    if (!signupBirthdate) { setSignupError("Enter your date of birth."); return; }
    const age = calcAge(signupBirthdate);
    if (age === null) { setSignupError("That date doesn't look right."); return; }
    if (age < 13) { setSignupError("You need to be 13 or older to create a channel here."); return; }

    setSignupError("");
    setSignupStage("sending");
    try {
      await signUpWithEmail({ name: signupName.trim(), email: signupEmail.trim(), birthdate: signupBirthdate });
      setSignupStage("sent");
    } catch (err) {
      setSignupError(err.message || "Something went wrong sending your sign-in link.");
      setSignupStage("form");
    }
  };

  const closeSignup = () => {
    setShowSignup(false);
    setSignupError("");
    setSignupStage("form");
  };

  const handleSignOut = async () => {
    await signOut();
    setView("landing");
  };

  const updateChannelMedia = (channelId, patch) => {
    setChannels((cs) => cs.map((c) => (c.id === channelId ? { ...c, ...patch } : c)));
  };

  return (
    <div style={styles.page}>
      <GlobalStyle />
      <NavBar
        user={user}
        notifications={user?.notifications || []}
        unreadCount={unreadCount}
        showNotifications={showNotifications}
        onToggleNotifications={toggleNotifications}
        onCloseNotifications={closeNotifications}
        onHome={() => setView("landing")}
        onFeed={() => setView("feed")}
        onGuidelines={() => setView("guidelines")}
        onHelp={() => setView("help")}
        onPricing={() => setView("plans")}
        onMission={() => setView("mission")}
        onUpload={() => setView("upload")}
        onDashboard={() => setView("dashboard")}
        onMessages={() => setView("messages")}
        onGoLive={() => setView("live")}
        onSignIn={() => setShowSignup(true)}
        onSignOut={handleSignOut}
        onSupportPlatform={() => setShowPlatformSupport(true)}
      />

      {view === "landing" && (
        <Landing onStart={() => setShowSignup(true)} onExplore={() => setView("feed")} />
      )}
      {view === "feed" && (
        <Feed
          channels={channels}
          canViewAdult={!!user?.isAdult}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenVideo={openVideo}
          following={user?.following || []}
          signedIn={!!user}
          onNeedSignup={() => setShowSignup(true)}
        />
      )}
      {view === "channel" && activeChannel && (
        <ChannelPage
          channel={activeChannel}
          canViewAdult={!!user?.isAdult}
          onBack={() => setView("feed")}
          onOpenVideo={openVideo}
          user={user}
          onToggleFollow={toggleFollow}
          onNeedSignup={() => setShowSignup(true)}
          onVotePoll={votePoll}
          onMessage={() => {
            if (!user) { setShowSignup(true); return; }
            setActiveThreadChannelId(activeChannel.id);
            setView("thread");
          }}
          onReport={() => {
            setReportPrefill({ type: "report", subject: `Channel: ${activeChannel.name} (${activeChannel.handle})` });
            setView("help");
          }}
          onTip={() => (user ? setTipTarget(activeChannel.id) : setShowSignup(true))}
          onToggleSuperfan={() => {
            if (!user) { setShowSignup(true); return; }
            if ((user.superfanOf || []).includes(activeChannel.id)) toggleSuperfan(activeChannel.id);
            else setSuperfanTarget(activeChannel.id);
          }}
        />
      )}
      {view === "messages" && user && (
        <MessagesList
          channels={channels}
          conversations={user.conversations || []}
          onOpenThread={(channelId) => { setActiveThreadChannelId(channelId); setView("thread"); }}
          onBack={() => setView("feed")}
        />
      )}
      {view === "thread" && activeThreadChannelId && (
        <MessageThread
          channel={channels.find((c) => c.id === activeThreadChannelId)}
          messages={activeThread?.messages || []}
          onBack={() => setView("messages")}
          onSend={(text) => sendMessage(activeThreadChannelId, text)}
        />
      )}
      {view === "live" && user && (
        <GoLive channel={channels.find((c) => c.id === user.channelId)} onEnd={() => setView("dashboard")} />
      )}
      {view === "watch" && activeChannel && activeVideo && (
        <WatchPage
          channel={activeChannel}
          video={activeVideo}
          user={user}
          canViewAdult={!!user?.isAdult}
          onBack={() => setView("feed")}
          onOpenChannel={() => setView("channel")}
          onRate={(rating) => rateVideo(activeChannel.id, activeVideo.id, rating)}
          onSetTone={(choice) => setTone(activeChannel.id, activeVideo.id, choice)}
          onAddComment={(text) => addComment(activeChannel.id, activeVideo.id, text)}
          onNeedSignup={() => setShowSignup(true)}
          onWantCritic={() => setShowCriticUpgrade(true)}
          onReport={() => {
            setReportPrefill({ type: "report", subject: `Video: "${activeVideo.title}" on ${activeChannel.handle}` });
            setView("help");
          }}
        />
      )}
      {view === "dashboard" && user && (
        <Dashboard
          channel={channels.find((c) => c.id === user.channelId)}
          onUpload={() => setView("upload")}
          onUpdateChannel={(patch) => updateChannelMedia(user.channelId, patch)}
          onOpenVideo={openVideo}
          onGoLive={() => setView("live")}
          onCreatePost={(post) => createPost(user.channelId, post)}
          onVotePoll={votePoll}
          onSettings={() => setView("settings")}
          onPlans={() => setView("plans")}
        />
      )}
      {view === "settings" && user && (
        <AccountSettings
          user={user}
          onBack={() => setView("dashboard")}
          onExportData={exportUserData}
          onDeleteAccount={deleteAccount}
        />
      )}
      {view === "help" && (
        <HelpCenter
          user={user}
          requests={user?.supportRequests || []}
          prefill={reportPrefill}
          onSubmit={(type, subject, details) => { submitSupportRequest(type, subject, details); setReportPrefill(null); }}
          onNeedSignup={() => setShowSignup(true)}
        />
      )}
      {view === "plans" && (
        <PlansPage
          channel={user ? channels.find((c) => c.id === user.channelId) : null}
          onChangePlan={changeChannelPlan}
          onBack={() => setView(user ? "dashboard" : "landing")}
          onNeedSignup={() => setShowSignup(true)}
        />
      )}
      {view === "upload" && (
        <UploadFlow
          disabled={!user}
          userIsAdult={!!user?.isAdult}
          channel={channels.find((c) => c.id === user?.channelId)}
          onWantUpgrade={() => setView("plans")}
          onNeedSignup={() => setShowSignup(true)}
          onPublish={(video) => {
            const newVideoId = video.id;
            setChannels((cs) =>
              cs.map((c) =>
                c.id === user.channelId
                  ? { ...c, videos: [{ ...video, views: 0, time: "just now", avgRating: 0, ratingCount: 0, criticAvgRating: 0, criticRatingCount: 0, myRating: null, starCount: 0, planetCount: 0, blackholeCount: 0, myReaction: null, comments: [] }, ...c.videos] }
                  : c
              )
            );
            setActiveChannelId(user.channelId);
            setView("channel");

            setTimeout(() => {
              const others = channels.filter((c) => c.id !== user.channelId);
              if (others.length === 0) return;
              const reactor = others[Math.floor(Math.random() * others.length)];
              const doComment = Math.random() > 0.5;
              setChannels((cs) =>
                cs.map((c) =>
                  c.id !== user.channelId
                    ? c
                    : {
                        ...c,
                        videos: c.videos.map((v) =>
                          v.id !== newVideoId
                            ? v
                            : doComment
                            ? { ...v, comments: [...(v.comments || []), { id: "cm" + Date.now(), author: reactor.handle, text: "Nice one — more like this please!", time: "just now" }] }
                            : (() => {
                                const npcRating = Math.random() > 0.3 ? 5 : 4;
                                const newCount = (v.ratingCount || 0) + 1;
                                const newAvg = ((v.avgRating || 0) * (v.ratingCount || 0) + npcRating) / newCount;
                                return { ...v, avgRating: newAvg, ratingCount: newCount };
                              })()
                        ),
                      }
                )
              );
              pushNotification(doComment ? `${reactor.handle} commented on your video "${video.title}"` : `${reactor.handle} rated your video "${video.title}"`);
            }, 4500);
          }}
        />
      )}
      {view === "guidelines" && <Guidelines />}
      {view === "mission" && <MissionPage onExplore={() => setView("feed")} onStart={() => setShowSignup(true)} onPricing={() => setView("plans")} />}

      {showSignup && (
        <SignupModal
          name={signupName}
          setName={setSignupName}
          email={signupEmail}
          setEmail={setSignupEmail}
          birthdate={signupBirthdate}
          setBirthdate={setSignupBirthdate}
          error={signupError}
          stage={signupStage}
          onClose={closeSignup}
          onSubmit={handleSignup}
        />
      )}

      {showCriticUpgrade && (
        <CriticUpgradeModal
          onClose={() => setShowCriticUpgrade(false)}
          onConfirm={() => { upgradeToCritic(); setShowCriticUpgrade(false); }}
        />
      )}

      {showPlatformSupport && (
        <PlatformSupportModal
          onClose={() => setShowPlatformSupport(false)}
          onSubmit={(amount) => supportPlatform(amount)}
        />
      )}

      {tipTarget && (
        <TipModal
          channel={channels.find((c) => c.id === tipTarget)}
          onClose={() => setTipTarget(null)}
          onSubmit={(amount, message) => sendTip(tipTarget, amount, message)}
        />
      )}

      {superfanTarget && (
        <SuperfanModal
          channel={channels.find((c) => c.id === superfanTarget)}
          onClose={() => setSuperfanTarget(null)}
          onConfirm={() => { toggleSuperfan(superfanTarget); setSuperfanTarget(null); }}
        />
      )}
    </div>
  );
}

// ---------- pieces ----------

function NavBar({ user, notifications, unreadCount, showNotifications, onToggleNotifications, onCloseNotifications, onHome, onFeed, onGuidelines, onHelp, onPricing, onMission, onUpload, onDashboard, onMessages, onGoLive, onSignIn, onSignOut, onSupportPlatform }) {
  return (
    <div style={styles.nav}>
      {showNotifications && <div style={styles.notifOverlay} onClick={onCloseNotifications} />}
      <div style={styles.navInner}>
        <div style={styles.logo} onClick={onHome}>
          <WorldMark size={30} />
          <span style={styles.logoText} className="whv-logotext-full">Home Planet TV</span>
          <span style={styles.logoTextShort} className="whv-logotext-short">HPTV</span>
        </div>
        <div style={styles.navLinks} className="whv-navlinks">
          <button style={styles.navLink} onClick={onFeed}>Explore</button>
          <button style={styles.navLink} onClick={onGuidelines}>Guidelines</button>
          <button style={styles.navLink} onClick={onHelp}>Help</button>
          <button style={styles.navLink} onClick={onPricing}>Pricing</button>
          <button style={styles.navLink} onClick={onMission}>Mission</button>
          <button style={styles.supportBtn} onClick={onSupportPlatform}>💛 Support HPTV</button>
          {user ? (
            <>
              <button style={styles.navLink} onClick={onDashboard}>My channel</button>
              <button style={styles.navLink} onClick={onMessages}>Messages</button>
              <button style={styles.liveBtn} onClick={onGoLive}>● Go Live</button>
              <div style={{ position: "relative" }}>
                <button style={styles.bellBtn} onClick={onToggleNotifications}>
                  🔔
                  {unreadCount > 0 && <span style={styles.bellBadge}>{unreadCount}</span>}
                </button>
                {showNotifications && (
                  <div style={styles.notifPanel}>
                    <div style={styles.notifHeader}>NOTIFICATIONS</div>
                    {notifications.length === 0 && <div style={styles.notifEmpty}>Nothing yet — post something!</div>}
                    {notifications.map((n) => (
                      <div key={n.id} style={styles.notifRow}>
                        <div style={styles.notifText}>{n.text}</div>
                        <div style={styles.notifTime}>{n.time}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button style={styles.uploadBtn} onClick={onUpload}>
                <WorldMark size={22} />
                Upload
              </button>
              <button style={styles.navLink} onClick={onSignOut}>Sign out</button>
            </>
          ) : (
            <button style={styles.navBtn} onClick={onSignIn}>Start your channel</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Landing({ onStart, onExplore }) {
  return (
    <div style={styles.hero}>
      <div style={styles.heroGlow} />
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
        <TVMark size={64} />
      </div>
      <div style={styles.eyebrow}>HOME PLANET TV</div>
      <h1 style={styles.h1}>
        Press record.
        <br />
        The world's watching.
      </h1>
      <p style={styles.sub}>
        A channel of your own, open to anyone, anywhere — home movies, hot takes, hobbies, and
        everything in between. No algorithm gatekeeping what you're allowed to say.
      </p>
      <div style={styles.heroBtns}>
        <button style={styles.primaryBtn} onClick={onStart}>Start your channel</button>
        <button style={styles.ghostBtn} onClick={onExplore}>Explore channels</button>
      </div>
      <div style={styles.pingRow}>
        {["Accra", "Chennai", "Lagos", "São Paulo", "Manila", "Warsaw"].map((city) => (
          <span key={city} style={styles.pingChip}><span style={styles.pingDot} /> {city}</span>
        ))}
      </div>
    </div>
  );
}

function ChannelHead({ channel, editable, onPickBanner, onPickAvatar }) {
  const bannerRef = useRef(null);
  const avatarRef = useRef(null);
  return (
    <div style={{ marginBottom: 30 }}>
      <div
        style={{
          ...styles.banner,
          backgroundImage: channel.bannerUrl ? `url(${channel.bannerUrl})` : undefined,
          cursor: editable ? "pointer" : "default",
        }}
        onClick={() => editable && bannerRef.current?.click()}
      >
        {!channel.bannerUrl && (
          <span style={styles.bannerPlaceholder}>
            {editable ? "Click to add a banner (1200×300 works well)" : ""}
          </span>
        )}
        {editable && (
          <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickBanner(URL.createObjectURL(f));
            }}
          />
        )}
      </div>
      <div style={styles.channelHeader}>
        <div
          style={{ ...styles.channelAvatar, cursor: editable ? "pointer" : "default", backgroundImage: channel.avatarUrl ? `url(${channel.avatarUrl})` : undefined }}
          onClick={() => editable && avatarRef.current?.click()}
        >
          {!channel.avatarUrl && channel.name[0]}
          {editable && (
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickAvatar(URL.createObjectURL(f));
              }}
            />
          )}
        </div>
        <div>
          <div style={styles.channelNameRow}>
            <div style={styles.channelName}>{channel.name}</div>
            {channel.plan === "creator" && <span style={styles.planBadgeCreator}>CREATOR</span>}
            {channel.plan === "pro" && <span style={styles.planBadgePro}>★ PRO CREATOR</span>}
          </div>
          <div style={styles.channelHandle}>{channel.handle}{channel.tagline ? ` · ${channel.tagline}` : ""}</div>
          {editable && <div style={styles.editHint}>Click the banner or your photo to change it</div>}
        </div>
      </div>
    </div>
  );
}

function Feed({ channels, canViewAdult, searchQuery, onSearchChange, onOpenVideo, following, signedIn, onNeedSignup }) {
  const [tab, setTab] = useState("all");
  const q = searchQuery.trim().toLowerCase();
  let allVideos = channels
    .flatMap((c) => c.videos.map((v) => ({ ...v, channel: c })))
    .filter((v) => !v.isAdult || canViewAdult)
    .filter((v) => !q || v.title.toLowerCase().includes(q) || v.channel.name.toLowerCase().includes(q) || v.channel.handle.toLowerCase().includes(q));
  if (tab === "following") allVideos = allVideos.filter((v) => following.includes(v.channel.id));

  return (
    <div style={styles.container}>
      <input
        style={{ ...styles.textInput, marginBottom: 18 }}
        placeholder="Search videos or channels"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div style={styles.tabRow}>
        <button style={{ ...styles.tabBtn, ...(tab === "all" ? styles.tabBtnActive : {}) }} onClick={() => setTab("all")}>
          For you
        </button>
        <button
          style={{ ...styles.tabBtn, ...(tab === "following" ? styles.tabBtnActive : {}) }}
          onClick={() => (signedIn ? setTab("following") : onNeedSignup())}
        >
          Following
        </button>
      </div>
      <div style={styles.sectionLabel}>{q ? `RESULTS FOR "${searchQuery}"` : tab === "following" ? "FROM CHANNELS YOU FOLLOW" : "NOW PLAYING, FROM EVERYWHERE"}</div>
      <div style={styles.videoGrid}>
        {allVideos.map((v) => (
          <VideoCard key={v.id} video={v} channelHandle={v.channel.handle} onClick={() => onOpenVideo(v.channel.id, v.id)} />
        ))}
        {allVideos.length === 0 && tab === "following" && (
          <div style={styles.emptyNote}>You're not following anyone yet — visit a channel and hit Follow.</div>
        )}
        {allVideos.length === 0 && tab === "all" && <div style={styles.emptyNote}>No videos match "{searchQuery}".</div>}
      </div>
    </div>
  );
}

function ChannelPage({ channel, canViewAdult, onBack, onOpenVideo, user, onToggleFollow, onNeedSignup, onVotePoll, onMessage, onReport, onTip, onToggleSuperfan }) {
  const videos = channel.videos.filter((v) => !v.isAdult || canViewAdult);
  const isOwn = user?.channelId === channel.id;
  const isFollowing = (user?.following || []).includes(channel.id);
  const isSuperfan = (user?.superfanOf || []).includes(channel.id);
  const tips = channel.tips || [];
  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={onBack}>← back to explore</button>
      <ChannelHead channel={channel} editable={false} />
      <div style={styles.followRow}>
        <span style={styles.videoMeta}>{formatCount(channel.followers)} followers</span>
        {!isOwn && (
          <>
            <button
              style={{ ...styles.followBtn, ...(isFollowing ? styles.followBtnActive : {}) }}
              onClick={() => (user ? onToggleFollow(channel.id) : onNeedSignup())}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
            <button style={styles.messageBtn} onClick={onMessage}>Message</button>
            <button style={styles.tipBtn} onClick={onTip}>💛 Send a tip</button>
            {channel.superfanPrice != null && (
              <button
                style={{ ...styles.superfanBtn, ...(isSuperfan ? styles.superfanBtnActive : {}) }}
                onClick={onToggleSuperfan}
              >
                {isSuperfan ? "✓ Superfan" : `⭐ Become a Superfan — $${channel.superfanPrice.toFixed(2)}/mo`}
              </button>
            )}
            <button style={styles.reportLink} onClick={onReport}>Report</button>
          </>
        )}
      </div>

      {tips.length > 0 && (
        <>
          <div style={styles.sectionLabel}>{tips.length} SUPPORTERS</div>
          <div style={{ marginBottom: 30 }}>
            {tips.map((t) => <TipRow key={t.id} tip={t} />)}
          </div>
        </>
      )}

      {(channel.posts || []).length > 0 && (
        <>
          <div style={styles.sectionLabel}>COMMUNITY</div>
          <div style={{ marginBottom: 30 }}>
            {channel.posts.map((p) => (
              <PollCard key={p.id} post={p} onVote={(optionIndex) => onVotePoll(channel.id, p.id, optionIndex)} />
            ))}
          </div>
        </>
      )}

      <div style={styles.sectionLabel}>{videos.length} VIDEOS</div>
      <div style={styles.videoGrid}>
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} onClick={() => onOpenVideo(channel.id, v.id)} />
        ))}
        {videos.length === 0 && <div style={styles.emptyNote}>Nothing posted yet.</div>}
      </div>
    </div>
  );
}

function VideoCard({ video, channelHandle, showComments, onClick }) {
  return (
    <div style={styles.videoCard} className="whv-video-card" onClick={onClick}>
      <div style={styles.thumb} className="whv-thumb-inner">
        <span style={styles.playTri} />
        {video.isAdult && <span style={styles.adultBadge}>18+</span>}
      </div>
      <div style={styles.videoTitle} className="whv-clamp2">{video.title}</div>

      <div style={styles.cardHeartsRow}>
        <HeartRow value={video.ratingCount > 0 ? video.avgRating : 0} color="#E8483B" size={13} />
        {video.ratingCount > 0 && (
          <span style={styles.cardRatingNum}>{video.avgRating.toFixed(1)} ({formatCount(video.ratingCount)})</span>
        )}
      </div>

      {video.criticRatingCount > 0 && (
        <div style={styles.cardHeartsRow}>
          <HeartRow value={video.criticAvgRating} color="#FFC107" size={13} />
          <span style={styles.cardRatingNumGold}>{video.criticAvgRating.toFixed(1)} critics</span>
        </div>
      )}

      {((video.starCount || 0) + (video.planetCount || 0) + (video.blackholeCount || 0)) > 0 && (
        <div style={styles.cardLightDarkRow}>
          <StarIcon filled color="#E8A33D" size={13} /> <span>{formatCount(video.starCount)}</span>
          <PlanetIcon filled color="#8C7F68" size={13} /> <span>{formatCount(video.planetCount)}</span>
          <BlackHoleIcon filled color="#2A2118" size={13} /> <span>{formatCount(video.blackholeCount)}</span>
        </div>
      )}

      <div style={styles.videoMeta}>
        {channelHandle ? `${channelHandle} · ` : ""}
        {formatCount(video.views)} views
        {showComments ? ` · 💬 ${(video.comments || []).length}` : ""} · {video.time}
      </div>
    </div>
  );
}

function PollCard({ post, onVote }) {
  const totalVotes = post.options.reduce((s, o) => s + o.votes, 0) || 1;
  return (
    <div style={styles.pollCard}>
      <div style={styles.pollQuestion}>{post.question}</div>
      {post.options.map((o, i) => {
        const pct = Math.round((o.votes / totalVotes) * 100);
        return (
          <div key={i} style={styles.pollOptionRow} onClick={() => post.voted === null && onVote(i)}>
            <div style={{ ...styles.pollOptionFill, width: post.voted !== null ? `${pct}%` : "0%" }} />
            <div style={styles.pollOptionLabel}>
              <span>{o.text}{post.voted === i ? " ✓" : ""}</span>
              {post.voted !== null && <span>{pct}%</span>}
            </div>
          </div>
        );
      })}
      <div style={styles.pollMeta}>{totalVotes} votes · {post.time}</div>
    </div>
  );
}

function TipRow({ tip }) {
  return (
    <div style={styles.tipRow}>
      <div style={styles.tipTop}>
        <span style={styles.tipFrom}>{tip.from}</span>
        <span style={styles.tipAmount}>${tip.amount.toFixed(2)}</span>
      </div>
      {tip.message && <div style={styles.tipMessage}>{tip.message}</div>}
      <div style={styles.tipTime}>{tip.time}</div>
    </div>
  );
}

function SuperfanPriceControl({ channel, onUpdateChannel }) {
  const [price, setPrice] = useState(channel.superfanPrice != null ? String(channel.superfanPrice) : "");

  const save = () => {
    const n = parseFloat(price);
    onUpdateChannel({ superfanPrice: n > 0 ? Math.round(n * 100) / 100 : null });
  };

  return (
    <div style={styles.uploadCard}>
      <div style={styles.fieldLabel}>SUPERFAN SUBSCRIPTION PRICE ($/month)</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          style={{ ...styles.textInput, marginBottom: 0, width: 120 }}
          type="number"
          min="1"
          step="0.5"
          placeholder="e.g. 4.99"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button style={styles.planBannerLink} onClick={save}>Save</button>
      </div>
      <div style={styles.uploadNote}>
        {channel.superfanPrice != null
          ? `Superfans currently pay $${channel.superfanPrice.toFixed(2)}/mo. Clear the field and save to turn this off.`
          : "Leave blank to keep Superfan subscriptions off your channel — viewers will still be able to send one-time tips."}
      </div>
    </div>
  );
}

function Dashboard({ channel, onUpload, onUpdateChannel, onOpenVideo, onGoLive, onCreatePost, onVotePoll, onSettings, onPlans }) {
  if (!channel) return null;
  const totalViews = channel.videos.reduce((s, v) => s + (v.views || 0), 0);
  const totalRatingPoints = channel.videos.reduce((s, v) => s + (v.avgRating || 0) * (v.ratingCount || 0), 0);
  const totalRatingCount = channel.videos.reduce((s, v) => s + (v.ratingCount || 0), 0);
  const channelAvgRating = totalRatingCount > 0 ? totalRatingPoints / totalRatingCount : 0;
  const totalComments = channel.videos.reduce((s, v) => s + (v.comments || []).length, 0);
  const maxViews = Math.max(1, ...channel.videos.map((v) => v.views || 0));
  const tips = channel.tips || [];
  const totalTips = tips.reduce((s, t) => s + t.amount, 0);
  const superfanCount = (channel.superfans || []).length;

  return (
    <div style={styles.container}>
      <div style={styles.dashHeaderRow}>
        <div style={styles.sectionLabel}>YOUR CHANNEL</div>
        <div style={{ display: "flex", gap: 14 }}>
          <button style={styles.settingsLink} onClick={onPlans}>💳 {PLANS[channel.plan || "free"].label} plan</button>
          <button style={styles.settingsLink} onClick={onSettings}>⚙ Account settings</button>
        </div>
      </div>
      <ChannelHead
        channel={channel}
        editable
        onPickBanner={(url) => onUpdateChannel({ bannerUrl: url })}
        onPickAvatar={(url) => onUpdateChannel({ avatarUrl: url })}
      />
      <div style={styles.dashActionRow}>
        <button style={styles.uploadBtnLarge} onClick={onUpload}>
          <TVMark size={26} rec={false} />
          Upload a video
        </button>
        <button style={styles.liveBtnLarge} onClick={onGoLive}>● Go Live</button>
      </div>

      <div style={{ height: 30 }} />
      <div style={styles.sectionLabel}>COMMUNITY</div>
      <CreatePostForm onCreatePost={onCreatePost} />
      {(channel.posts || []).length > 0 && (
        <div style={{ marginTop: 14 }}>
          {channel.posts.map((p) => (
            <PollCard key={p.id} post={p} onVote={(optionIndex) => onVotePoll(channel.id, p.id, optionIndex)} />
          ))}
        </div>
      )}

      <div style={{ height: 30 }} />
      <div style={styles.sectionLabel}>CHANNEL ANALYTICS</div>
      <div style={styles.statRow}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{formatCount(channel.followers)}</div>
          <div style={styles.statLabel}>Followers</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{formatCount(totalViews)}</div>
          <div style={styles.statLabel}>Total views</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statNum, display: "flex", alignItems: "center", gap: 6 }}>
            {totalRatingCount > 0 ? (
              <>{channelAvgRating.toFixed(1)} <HeartIcon filled color="#E8483B" size={18} /></>
            ) : "—"}
          </div>
          <div style={styles.statLabel}>Avg rating</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{totalComments}</div>
          <div style={styles.statLabel}>Comments</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>${totalTips.toFixed(2)}</div>
          <div style={styles.statLabel}>Tips received</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{superfanCount}</div>
          <div style={styles.statLabel}>Superfans</div>
        </div>
      </div>

      <div style={{ height: 30 }} />
      <div style={styles.sectionLabel}>SUPPORT</div>
      <SuperfanPriceControl channel={channel} onUpdateChannel={onUpdateChannel} />
      {tips.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {tips.map((t) => <TipRow key={t.id} tip={t} />)}
        </div>
      )}

      {channel.videos.length > 0 && (
        <div style={{ marginTop: 22 }}>
          {channel.videos.map((v) => (
            <div key={v.id} style={styles.barRow}>
              <div style={styles.barLabel}>{v.title}</div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${Math.max(6, ((v.views || 0) / maxViews) * 100)}%` }} />
              </div>
              <div style={styles.barValue}>{formatCount(v.views)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 28 }} />
      <div style={styles.sectionLabel}>{channel.videos.length} POSTED</div>
      <div style={styles.videoGrid}>
        {channel.videos.map((v) => (
          <VideoCard key={v.id} video={v} showComments onClick={() => onOpenVideo(channel.id, v.id)} />
        ))}
      </div>
    </div>
  );
}

function CreatePostForm({ onCreatePost }) {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const submit = () => {
    if (mode === "text") {
      if (!text.trim()) return;
      onCreatePost({ type: "text", text: text.trim() });
      setText("");
    } else {
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      if (!question.trim() || cleanOptions.length < 2) return;
      onCreatePost({ type: "poll", question: question.trim(), options: cleanOptions.map((t) => ({ text: t, votes: 0 })), voted: null });
      setQuestion("");
      setOptions(["", ""]);
    }
  };

  return (
    <div style={styles.uploadCard}>
      <div style={styles.tabRow}>
        <button style={{ ...styles.tabBtn, ...(mode === "text" ? styles.tabBtnActive : {}) }} onClick={() => setMode("text")}>Update</button>
        <button style={{ ...styles.tabBtn, ...(mode === "poll" ? styles.tabBtnActive : {}) }} onClick={() => setMode("poll")}>Poll</button>
      </div>
      {mode === "text" ? (
        <input style={styles.textInput} placeholder="Share an update with your followers" value={text} onChange={(e) => setText(e.target.value)} />
      ) : (
        <>
          <input style={styles.textInput} placeholder="Ask a question" value={question} onChange={(e) => setQuestion(e.target.value)} />
          {options.map((o, i) => (
            <input
              key={i}
              style={styles.textInput}
              placeholder={`Option ${i + 1}`}
              value={o}
              onChange={(e) => setOptions((opts) => opts.map((x, xi) => (xi === i ? e.target.value : x)))}
            />
          ))}
          {options.length < 4 && (
            <button style={styles.linkBtn} onClick={() => setOptions((o) => [...o, ""])}>+ add option</button>
          )}
        </>
      )}
      <div style={{ height: 10 }} />
      <button
        style={{
          ...styles.primaryBtn,
          width: "100%",
          opacity: mode === "text" ? (text.trim() ? 1 : 0.5) : (question.trim() && options.filter((o) => o.trim()).length >= 2 ? 1 : 0.5),
        }}
        onClick={submit}
      >
        Post
      </button>
    </div>
  );
}

function MessagesList({ channels, conversations, onOpenThread, onBack }) {
  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={onBack}>← back to explore</button>
      <div style={styles.sectionLabel}>MESSAGES</div>
      {conversations.length === 0 && <div style={styles.emptyNote}>No conversations yet — message a creator from their channel.</div>}
      {conversations.map((c) => {
        const channel = channels.find((ch) => ch.id === c.channelId);
        const last = c.messages[c.messages.length - 1];
        if (!channel) return null;
        return (
          <div key={c.channelId} style={styles.conversationRow} onClick={() => onOpenThread(c.channelId)}>
            <div style={{ ...styles.channelAvatar, width: 40, height: 40, fontSize: 16, border: "none", backgroundImage: channel.avatarUrl ? `url(${channel.avatarUrl})` : undefined }}>
              {!channel.avatarUrl && channel.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.conversationName}>{channel.name}</div>
              <div style={styles.conversationPreview}>{last?.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MessageThread({ channel, messages, onBack, onSend }) {
  const [text, setText] = useState("");
  if (!channel) return null;
  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };
  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={onBack}>← back to messages</button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ ...styles.channelAvatar, width: 36, height: 36, fontSize: 15, border: "none", backgroundImage: channel.avatarUrl ? `url(${channel.avatarUrl})` : undefined }}>
          {!channel.avatarUrl && channel.name[0]}
        </div>
        <div style={styles.channelName}>{channel.name}</div>
      </div>
      <div style={{ marginBottom: 20 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ ...styles.messageBubble, ...(m.from === "me" ? styles.messageBubbleMe : {}) }}>
            {m.text}
          </div>
        ))}
        {messages.length === 0 && <div style={styles.emptyNote}>Say hello.</div>}
      </div>
      <div style={styles.commentInputRow}>
        <input
          style={{ ...styles.textInput, marginBottom: 0, flex: 1 }}
          placeholder="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button style={{ ...styles.primaryBtn, opacity: text.trim() ? 1 : 0.5 }} onClick={submit}>Send</button>
      </div>
    </div>
  );
}

function GoLive({ channel, onEnd }) {
  const [error, setError] = useState("");
  const [viewers, setViewers] = useState(3);
  const [chat, setChat] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const LIVE_CHAT_LINES = ["hey!! 👋", "this is so cool", "love this idea", "how long you streaming for?", "🔥🔥🔥"];

  useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia?.({ video: true, audio: true })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError("Couldn't access your camera/mic — check your browser permissions."));

    const viewerTimer = setInterval(() => setViewers((v) => Math.max(1, v + (Math.random() > 0.5 ? 1 : -1))), 4000);
    const chatTimer = setInterval(() => {
      setChat((c) => [...c, { id: "lc" + Date.now(), text: LIVE_CHAT_LINES[Math.floor(Math.random() * LIVE_CHAT_LINES.length)] }].slice(-30));
    }, 3500);

    return () => {
      active = false;
      clearInterval(viewerTimer);
      clearInterval(chatTimer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onEnd();
  };

  if (!channel) return null;

  return (
    <div style={styles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={styles.liveDot} />
        <div style={styles.sectionLabel}>YOU'RE LIVE · {viewers} watching</div>
      </div>

      {error ? (
        <div style={styles.uploadCard}>{error}</div>
      ) : (
        <video ref={videoRef} autoPlay muted playsInline style={styles.videoPlayer} />
      )}

      <div style={{ height: 14 }} />
      <div style={styles.liveChatBox}>
        {chat.map((c) => (
          <div key={c.id} style={styles.liveChatLine}>{c.text}</div>
        ))}
        {chat.length === 0 && <div style={styles.emptyNote}>Chat will appear here as people join.</div>}
      </div>

      <div style={{ height: 16 }} />
      <button style={styles.endLiveBtn} onClick={endStream}>End stream</button>
      <div style={styles.uploadNote}>
        This demo streams your camera to you only — real multi-viewer live streaming needs a live
        streaming backend, which comes with the platform's real infrastructure build.
      </div>
    </div>
  );
}

function WatchPage({ channel, video, user, canViewAdult, onBack, onOpenChannel, onRate, onSetTone, onAddComment, onNeedSignup, onWantCritic, onReport }) {
  const [commentText, setCommentText] = useState("");
  const [viewerSpeed, setViewerSpeed] = useState(1);
  const videoRef = useRef(null);
  const blocked = video.isAdult && !canViewAdult;
  const comments = video.comments || [];
  const hasTrim = video.trimStart != null && video.trimEnd != null && (video.trimStart > 0 || video.trimEnd < (video.rawDurationSec || video.trimEnd));

  const submitComment = () => {
    if (!user) { onNeedSignup(); return; }
    if (!commentText.trim()) return;
    onAddComment(commentText);
    setCommentText("");
  };

  const goFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.webkitEnterFullscreen) el.webkitEnterFullscreen();
  };

  const handleLoadedMeta = () => {
    const el = videoRef.current;
    if (!el) return;
    if (hasTrim) el.currentTime = video.trimStart;
    el.playbackRate = viewerSpeed;
  };

  const handleTimeUpdate = () => {
    if (!hasTrim || !videoRef.current) return;
    const el = videoRef.current;
    if (el.currentTime >= video.trimEnd) el.pause();
    else if (el.currentTime < video.trimStart) el.currentTime = video.trimStart;
  };

  const changeSpeed = (s) => {
    setViewerSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={onBack}>← back to explore</button>

      {blocked ? (
        <div style={styles.uploadCard}>
          <div style={styles.guidelineTitle}>This video is 18+</div>
          <div style={styles.guidelineDesc}>Sign in with an adult account to watch it.</div>
        </div>
      ) : video.videoUrl ? (
        <>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <video
              ref={videoRef}
              src={video.videoUrl}
              controls
              playsInline
              style={{ ...styles.videoPlayer, filter: FILTERS[video.filter || "none"].css }}
              onLoadedMetadata={handleLoadedMeta}
              onTimeUpdate={handleTimeUpdate}
            />
            {video.isAdult && <span style={styles.adultBadge}>18+</span>}
          </div>
          {hasTrim && (
            <div style={styles.uploadNote}>
              Trimmed to {formatDuration(video.trimStart)}–{formatDuration(video.trimEnd)} of the original upload.
            </div>
          )}
          <div style={styles.speedRow}>
            <span style={styles.fieldLabel}>SPEED</span>
            {VIEWER_SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                style={{ ...styles.speedBtn, ...(viewerSpeed === s ? styles.speedBtnActive : {}) }}
                onClick={() => changeSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
          <button style={styles.fullscreenBtn} onClick={goFullscreen}>⛶ Watch fullscreen</button>
        </>
      ) : (
        <div style={styles.watchThumb}>
          <span style={styles.playTriBig} />
          {video.isAdult && <span style={styles.adultBadge}>18+</span>}
          <span style={styles.thumbNote}>No video file attached to this demo entry</span>
        </div>
      )}

      {!blocked && (
        <>
          <h2 style={styles.h2}>{video.title}</h2>

          <div style={styles.watchMetaRow}>
            <button style={styles.channelChip} onClick={onOpenChannel}>
              <span
                style={{
                  ...styles.channelAvatar,
                  width: 30,
                  height: 30,
                  fontSize: 13,
                  border: "none",
                  backgroundImage: channel.avatarUrl ? `url(${channel.avatarUrl})` : undefined,
                }}
              >
                {!channel.avatarUrl && channel.name[0]}
              </span>
              {channel.handle}
            </button>
            <span style={styles.videoMeta}>{formatCount(video.views)} views · {video.time}</span>
          </div>

          <div style={styles.ratingBlock}>
            <div style={styles.ratingAvgLine}>
              {video.ratingCount > 0 ? (
                <>
                  <span style={styles.ratingAvgNum}>{video.avgRating.toFixed(1)}</span>
                  <HeartRow value={video.avgRating} color="#E8483B" size={16} />
                  <span style={styles.videoMeta}>({formatCount(video.ratingCount)} ratings)</span>
                </>
              ) : (
                <span style={styles.videoMeta}>No ratings yet — be the first</span>
              )}
            </div>

            {video.criticRatingCount > 0 && (
              <div style={styles.criticScoreLine}>
                <span style={styles.criticBadge}>✓ CRITIC SCORE</span>
                <span style={styles.criticScoreNum}>{video.criticAvgRating.toFixed(1)}</span>
                <HeartRow value={video.criticAvgRating} color="#FFC107" size={16} />
                <span style={styles.videoMeta}>({video.criticRatingCount} verified critics)</span>
              </div>
            )}

            <div style={styles.ratingRowLabel}>
              Your rating: {user?.isCritic && <span style={styles.criticBadgeSmall}>✓ Critic</span>}
            </div>
            <div style={styles.ratingHeartsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  style={styles.ratingHeartBtn}
                  onClick={() => (user ? onRate(n) : onNeedSignup())}
                >
                  <HeartIcon
                    filled={video.myRating != null && n <= video.myRating}
                    color={user?.isCritic ? "#FFC107" : "#E8483B"}
                    size={28}
                  />
                </span>
              ))}
            </div>

            {user && !user.isCritic && (
              <button style={styles.criticUpsellLink} onClick={onWantCritic}>
                Become a Verified Critic — make your rating count toward the Critic Score
              </button>
            )}
          </div>

          <div style={{ height: 16 }} />
          <div style={styles.toneBlock}>
            <div style={styles.ratingRowLabel}>STAR, PLANET, OR BLACK HOLE?</div>
            <div style={styles.toneRow}>
              <button
                style={{ ...styles.starBtn, ...(video.myReaction === "star" ? styles.starBtnActive : {}) }}
                onClick={() => (user ? onSetTone("star") : onNeedSignup())}
              >
                <StarIcon filled={video.myReaction === "star"} color="#E8A33D" size={22} />
                Star · {formatCount(video.starCount)}
              </button>
              <button
                style={{ ...styles.planetBtn, ...(video.myReaction === "planet" ? styles.planetBtnActive : {}) }}
                onClick={() => (user ? onSetTone("planet") : onNeedSignup())}
              >
                <PlanetIcon filled={video.myReaction === "planet"} color="#5C5140" size={22} />
                Planet · {formatCount(video.planetCount)}
              </button>
              <button
                style={{ ...styles.blackholeBtn, ...(video.myReaction === "blackhole" ? styles.blackholeBtnActive : {}) }}
                onClick={() => (user ? onSetTone("blackhole") : onNeedSignup())}
              >
                <BlackHoleIcon filled={video.myReaction === "blackhole"} color="#F5EEDD" size={22} />
                Black Hole · {formatCount(video.blackholeCount)}
              </button>
            </div>
            <div style={styles.toneCaption}>Bright and uplifting, somewhere in between, or pulls you into something heavy.</div>
          </div>

          <div style={{ height: 16 }} />
          <button style={styles.reportLink} onClick={onReport}>⚑ Report this video</button>

          <div style={{ height: 30 }} />
          <div style={styles.sectionLabel}>{comments.length} COMMENTS</div>

          <div style={styles.commentInputRow}>
            <input
              style={{ ...styles.textInput, marginBottom: 0, flex: 1 }}
              placeholder={user ? "Add a comment" : "Sign up to comment"}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onFocus={() => !user && onNeedSignup()}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
            />
            <button style={{ ...styles.primaryBtn, opacity: commentText.trim() ? 1 : 0.5 }} onClick={submitComment}>Post</button>
          </div>

          {comments.map((c) => (
            <div key={c.id} style={styles.commentRow}>
              <div style={styles.commentAuthor}>{c.author}</div>
              <div style={styles.commentText}>{c.text}</div>
              <div style={styles.commentTime}>{c.time}</div>
            </div>
          ))}
          {comments.length === 0 && <div style={styles.emptyNote}>No comments yet — be the first.</div>}
        </>
      )}
    </div>
  );
}

function UploadFlow({ disabled, userIsAdult, channel, onWantUpgrade, onNeedSignup, onPublish }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [stage, setStage] = useState("form");
  const [stepIdx, setStepIdx] = useState(0);
  const [rawDuration, setRawDuration] = useState(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [filter, setFilter] = useState("none");
  const [reading, setReading] = useState(false);
  const [quality, setQuality] = useState("720p");
  const [fileUrl, setFileUrl] = useState(null);
  const fileRef = useRef(null);
  const probeRef = useRef(null);
  const previewRef = useRef(null);

  const plan = PLANS[channel?.plan || "free"];
  const libraryUsedSec = (channel?.videos || []).reduce((s, v) => s + (v.durationSec || 0), 0);
  const durationSec = rawDuration != null ? trimEnd - trimStart : null;
  const overLength = durationSec != null && durationSec > plan.maxLen;
  const overLibrary = durationSec != null && libraryUsedSec + durationSec > plan.maxLibrary;
  const canPublish = file && title.trim() && durationSec != null && durationSec > 0 && !overLength && !overLibrary;

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setRawDuration(null);
    setReading(true);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const url = URL.createObjectURL(f);
    setFileUrl(url);
    const probe = probeRef.current;
    probe.src = url;
    probe.onloadedmetadata = () => {
      setRawDuration(probe.duration);
      setTrimStart(0);
      setTrimEnd(probe.duration);
      setReading(false);
    };
  };

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewTrim = () => {
    const el = previewRef.current;
    if (!el) return;
    el.currentTime = trimStart;
    el.play();
  };

  const runChecks = () => {
    if (disabled) { onNeedSignup(); return; }
    if (!canPublish) return;
    setStage("checking");
    setStepIdx(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setStepIdx(i);
      if (i >= MOD_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setStage("done");
          onPublish({
            id: "v" + Date.now(),
            title: title.trim(),
            isAdult,
            videoUrl: fileUrl,
            durationSec,
            rawDurationSec: rawDuration,
            trimStart,
            trimEnd,
            filter,
            quality,
          });
        }, 500);
      }
    }, 900);
  };

  return (
    <div style={styles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <TVMark size={34} />
        <div style={styles.sectionLabel}>UPLOAD TO HOME PLANET TV</div>
      </div>

      <video ref={probeRef} style={{ display: "none" }} />

      {stage === "form" && (
        <div style={styles.uploadCard}>
          <div style={styles.planBanner}>
            <span>{plan.label} plan</span>
            <span style={styles.planBannerLimit}>
              up to {plan.maxLen === Infinity ? "unlimited length" : formatDuration(plan.maxLen)} · {plan.maxQuality} max
            </span>
            <button style={styles.planBannerLink} onClick={onWantUpgrade}>Upgrade</button>
          </div>

          <div style={styles.dropZone} onClick={() => fileRef.current?.click()}>
            {file ? file.name : "Click to choose a video file"}
            <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => pickFile(e.target.files?.[0])} />
          </div>

          {reading && <div style={styles.uploadNote}>Reading video length…</div>}

          {rawDuration != null && (
            <>
              <video
                ref={previewRef}
                src={fileUrl}
                controls
                playsInline
                style={{ ...styles.videoPlayer, filter: FILTERS[filter].css, marginBottom: 12 }}
              />

              <div style={styles.fieldLabel}>TRIM (raw clip is {formatDuration(rawDuration)})</div>
              <div style={styles.trimRow}>
                <span style={styles.trimTime}>{formatDuration(trimStart)}</span>
                <input
                  type="range"
                  min={0}
                  max={rawDuration}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.5))}
                  style={styles.trimSlider}
                />
              </div>
              <div style={styles.trimRow}>
                <span style={styles.trimTime}>{formatDuration(trimEnd)}</span>
                <input
                  type="range"
                  min={0}
                  max={rawDuration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.5))}
                  style={styles.trimSlider}
                />
              </div>
              <button style={styles.planBannerLink} onClick={previewTrim}>▶ Preview trimmed clip</button>

              <div style={{ height: 14 }} />
              <div style={styles.fieldLabel}>EFFECTS</div>
              <div style={styles.qualityRow}>
                {Object.entries(FILTERS).map(([id, f]) => (
                  <button
                    key={id}
                    style={{ ...styles.qualityBtn, ...(filter === id ? styles.qualityBtnActive : {}) }}
                    onClick={() => setFilter(id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ ...styles.uploadNote, color: overLength || overLibrary ? "#E8483B" : "#4FA391", fontWeight: 600 }}>
                Final length: {formatDuration(durationSec)}
                {overLength && ` — over your ${plan.label} plan's ${formatDuration(plan.maxLen)} limit. Trim it shorter, or upgrade to a plan with more room.`}
                {!overLength && overLibrary && ` — this would put you over your plan's total library limit.`}
              </div>
              {(overLength || overLibrary) && (
                <button style={styles.planBannerLink} onClick={onWantUpgrade}>Upgrade your plan to publish this →</button>
              )}
            </>
          )}

          <div style={{ height: 6 }} />

          <input style={styles.textInput} placeholder="Give it a title" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div style={styles.fieldLabel}>UPLOAD QUALITY</div>
          <div style={styles.qualityRow}>
            {QUALITY_OPTIONS.map((q) => {
              const locked = q.rank > plan.qualityRank;
              return (
                <button
                  key={q.id}
                  style={{ ...styles.qualityBtn, ...(quality === q.id ? styles.qualityBtnActive : {}), ...(locked ? styles.qualityBtnLocked : {}) }}
                  onClick={() => (locked ? onWantUpgrade() : setQuality(q.id))}
                >
                  {locked ? "🔒 " : ""}{q.id}
                </button>
              );
            })}
          </div>

          <div style={{ height: 6 }} />
          <label style={{ ...styles.checkRow, opacity: userIsAdult ? 1 : 0.5, marginBottom: 14, padding: "6px 4px", cursor: userIsAdult ? "pointer" : "default" }}>
            <input
              type="checkbox"
              checked={isAdult}
              disabled={!userIsAdult}
              onChange={(e) => setIsAdult(e.target.checked)}
              style={{ width: 19, height: 19, flexShrink: 0 }}
            />
            <span>
              This video is 18+ / adult content
              {!userIsAdult && " (only available to verified 18+ accounts)"}
            </span>
          </label>

          <div style={styles.uploadNote}>
            Every upload runs through two automatic checks before it goes live — see below.
            Adult-flagged videos are hidden from anyone not signed in as 18+. Everything else
            about what you say is yours to decide.
          </div>
          <button style={{ ...styles.primaryBtn, width: "100%", opacity: canPublish ? 1 : 0.5 }} disabled={!canPublish} onClick={runChecks}>Publish</button>
        </div>
      )}

      {stage === "checking" && (
        <div style={styles.uploadCard}>
          {MOD_STEPS.map((s, i) => (
            <div key={s} style={styles.checkRow}>
              <span style={{ ...styles.checkDot, background: i < stepIdx ? "#4FA391" : "#D8CBB0" }} />
              <span style={{ color: i < stepIdx ? "#2A2118" : "#8C7F68" }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {stage === "done" && (
        <div style={styles.uploadCard}>
          <div style={{ color: "#4FA391", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
            Published. Sending you to your channel…
          </div>
        </div>
      )}
    </div>
  );
}

function HelpCenter({ user, requests, prefill, onSubmit, onNeedSignup }) {
  const [type, setType] = useState(prefill?.type || "support");
  const [subject, setSubject] = useState(prefill?.subject || "");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (!user) { onNeedSignup(); return; }
    if (!subject.trim() || !details.trim()) return;
    onSubmit(type, subject.trim(), details.trim());
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setSubject("");
    setDetails("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.sectionLabel}>HELP & TRUST</div>
      <h2 style={styles.h2}>How can we help?</h2>
      <p style={styles.guidelinesIntro}>
        Whether you need general support, want to report something, or think a moderation
        decision was a mistake — this goes to a real person, not a black hole.
      </p>

      <div style={styles.uploadCard}>
        <div style={styles.tabRow}>
          <button style={{ ...styles.tabBtn, ...(type === "support" ? styles.tabBtnActive : {}) }} onClick={() => setType("support")}>Support</button>
          <button style={{ ...styles.tabBtn, ...(type === "report" ? styles.tabBtnActive : {}) }} onClick={() => setType("report")}>Report</button>
          <button style={{ ...styles.tabBtn, ...(type === "appeal" ? styles.tabBtnActive : {}) }} onClick={() => setType("appeal")}>Appeal a decision</button>
        </div>
        <input style={styles.textInput} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea
          style={{ ...styles.textInput, minHeight: 100, resize: "vertical" }}
          placeholder={
            type === "appeal"
              ? "Explain why you think this decision should be reconsidered"
              : type === "report"
              ? "What happened, and where?"
              : "How can we help?"
          }
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <button style={{ ...styles.primaryBtn, width: "100%", opacity: subject.trim() && details.trim() ? 1 : 0.5 }} onClick={submit}>{sent ? "Sent ✓" : "Submit"}</button>
        {!user && <div style={styles.uploadNote}>You'll need an account to submit — we reply by account, not by anonymous message.</div>}
      </div>

      {user && requests.length > 0 && (
        <>
          <div style={{ height: 26 }} />
          <div style={styles.sectionLabel}>YOUR REQUESTS</div>
          {requests.map((r) => (
            <div key={r.id} style={styles.requestRow}>
              <div style={styles.requestTop}>
                <span style={styles.requestType}>{r.type.toUpperCase()}</span>
                <span style={styles.requestStatus}>{r.status}</span>
              </div>
              <div style={styles.requestSubject}>{r.subject}</div>
              <div style={styles.requestTime}>{r.time} · Ref #{r.id.slice(-6).toUpperCase()}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function PlansPage({ channel, onChangePlan, onBack, onNeedSignup }) {
  const currentPlan = channel?.plan || null;
  const usedSec = channel ? (channel.videos || []).reduce((s, v) => s + (v.durationSec || 0), 0) : 0;

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={onBack}>← back</button>
      <div style={styles.sectionLabel}>CREATOR PLAN</div>
      <h2 style={styles.h2}>Room to grow, on your terms.</h2>
      <p style={styles.guidelinesIntro}>
        Free stays genuinely useful. Paid tiers unlock longer uploads, higher quality, and more
        library space — priced around what it actually costs to host your videos, not padded.
      </p>

      <div style={styles.pricingWhyBox}>
        <div style={styles.guidelineTitle}>Why we charge instead of running ads</div>
        <div style={styles.guidelineDesc}>
          Storing and streaming video costs real money, no matter who's hosting it. Most
          platforms cover that cost by selling your attention to advertisers — which means
          advertisers end up with real influence over what's allowed to succeed: what's "brand
          safe," what's too political, what's too controversial to run next to an ad. We'd
          rather you pay directly for what you use than hand a third party quiet control over
          what you're allowed to say. These plans exist to cover real hosting costs, not to
          squeeze you and not to hand editorial control to an advertiser's comfort level. As
          long as what you make is lawful, it's yours to make here — not limited by an
          advertiser's opinions, and not limited by anyone's political ideology.
        </div>
      </div>

      <div style={styles.planGrid}>
        {Object.values(PLANS).map((p) => {
          const isCurrent = p.id === currentPlan;
          return (
            <div key={p.id} style={{ ...styles.planCard, ...(isCurrent ? styles.planCardActive : {}) }}>
              <div style={styles.planCardName}>{p.label}</div>
              <div style={styles.planCardPrice}>{p.price === 0 ? "Free" : `$${p.price.toFixed(2)}/mo`}</div>
              <div style={styles.planCardFeature}>Up to {p.maxLen === Infinity ? "unlimited" : formatDuration(p.maxLen)} per video</div>
              <div style={styles.planCardFeature}>{p.maxQuality} max quality</div>
              <div style={styles.planCardFeature}>{p.maxLibrary === Infinity ? "Unlimited" : formatDuration(p.maxLibrary).split(":")[0] + " min"} total library</div>
              {channel ? (
                <button
                  style={isCurrent ? styles.planCardBtnCurrent : styles.planCardBtn}
                  disabled={isCurrent}
                  onClick={() => onChangePlan(p.id)}
                >
                  {isCurrent ? "Current plan" : p.price === 0 ? "Downgrade" : "Upgrade"}
                </button>
              ) : (
                <button style={styles.planCardBtn} onClick={onNeedSignup}>
                  {p.price === 0 ? "Start free" : "Sign up to choose"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ height: 22 }} />
      <div style={styles.uploadNote}>
        {channel && (
          <>You're using {formatDuration(usedSec)} of your {PLANS[currentPlan].maxLibrary === Infinity ? "unlimited" : formatDuration(PLANS[currentPlan].maxLibrary)} library. </>
        )}
        Demo only — no real payment is collected here.
      </div>
    </div>
  );
}

function AccountSettings({ user, onBack, onExportData, onDeleteAccount }) {
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={onBack}>← back to your channel</button>
      <div style={styles.sectionLabel}>ACCOUNT SETTINGS</div>

      <div style={styles.uploadCard}>
        <div style={styles.fieldLabel}>NAME</div>
        <div style={styles.settingsValue}>{user.name}</div>
        <div style={styles.fieldLabel}>EMAIL</div>
        <div style={styles.settingsValue}>{user.email}</div>
        <div style={styles.fieldLabel}>HANDLE</div>
        <div style={styles.settingsValue}>{user.handle}</div>
      </div>

      <div style={{ height: 24 }} />
      <div style={styles.sectionLabel}>YOUR DATA</div>
      <div style={styles.uploadCard}>
        <div style={styles.uploadNote}>
          Download a copy of your account, channel, and video data at any time.
        </div>
        <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={onExportData}>Export my data</button>
      </div>

      <div style={{ height: 24 }} />
      <div style={styles.sectionLabel}>DANGER ZONE</div>
      <div style={styles.dangerCard}>
        <div style={styles.uploadNote}>
          Deleting your account removes your channel, videos, and profile. This can't be undone.
        </div>
        {!showDelete ? (
          <button style={styles.dangerBtn} onClick={() => setShowDelete(true)}>Delete my account</button>
        ) : (
          <>
            <input
              style={styles.textInput}
              placeholder='Type "DELETE" to confirm'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <button
              style={{ ...styles.dangerBtn, opacity: confirmText === "DELETE" ? 1 : 0.5 }}
              disabled={confirmText !== "DELETE"}
              onClick={onDeleteAccount}
            >
              Permanently delete my account
            </button>
            <button style={styles.linkBtn} onClick={() => { setShowDelete(false); setConfirmText(""); }}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}

function MissionPage({ onExplore, onStart, onPricing }) {
  return (
    <div style={styles.container}>
      <div style={styles.sectionLabel}>OUR MISSION</div>
      <h2 style={styles.h2}>Press record. The world's watching.</h2>
      <p style={styles.guidelinesIntro}>
        Home Planet TV exists so that anyone, anywhere, can hit record and have somewhere real
        to put it — not an algorithm deciding whether you deserve to be seen, not an advertiser
        deciding whether your opinion is "brand safe." Just a channel of your own, open to
        anyone willing to watch. Home movies, hot takes, hobbies, and everything in between.
      </p>

      <div style={{ height: 10 }} />
      <div style={styles.sectionLabel}>HOW YOU MAKE MONEY HERE</div>
      <div style={styles.guidelineRow}>
        <div style={styles.guidelineTitle}>Direct support from real fans</div>
        <div style={styles.guidelineDesc}>
          Tips and Superfan subscriptions, priced however you choose. We take just 15–20% —
          compare that to YouTube's 30%. The platform should work for you, not the other way
          around.
        </div>
      </div>
      <div style={styles.guidelineRow}>
        <div style={styles.guidelineTitle}>No ad revenue — and no ad strings attached</div>
        <div style={styles.guidelineDesc}>
          We don't run third-party ads, so there's no ad revenue share to chase — but it also
          means nobody can quietly demonetize you for covering a hard topic, taking a side, or
          making something an advertiser finds inconvenient. Curious how we cover our costs
          instead?{" "}
          <button style={styles.inlineLink} onClick={onPricing}>See our pricing philosophy.</button>
        </div>
      </div>
      <div style={styles.guidelineRow}>
        <div style={styles.guidelineTitle}>Meaningful content earns more than viral bait</div>
        <div style={styles.guidelineDesc}>
          Since you're paid by the people who actually value what you make, not by an algorithm
          optimizing for watch time, the best strategy here is the honest one: make something
          real, and let the people who care about it find you and stick around.
        </div>
      </div>

      <div style={{ height: 20 }} />
      <div style={styles.heroBtns}>
        <button style={styles.primaryBtn} onClick={onStart}>Start your channel</button>
        <button style={styles.ghostBtn} onClick={onExplore}>Explore channels</button>
      </div>
    </div>
  );
}


function Guidelines() {
  return (
    <div style={styles.container}>
      <div style={styles.sectionLabel}>THE FLOOR — NOT A SUGGESTION LIST</div>
      <h2 style={styles.h2}>What actually isn't allowed here</h2>
      <p style={styles.guidelinesIntro}>
        This list is short on purpose. It's not a content strategy or a taste filter — it's the
        legal minimum every hosting platform has to enforce, everywhere in the world.
      </p>
      {[
        ["Child sexual abuse material", "Detected automatically before publish, and reported where legally required. No exceptions, no appeals."],
        ["Sexually explicit content", "Home Planet TV doesn't host pornography or content depicting sex acts, regardless of the 18+ flag. This may change in the future as a separate, age-verified offering — it isn't part of the platform today."],
        ["Terrorism and violent extremism content", "Material that recruits for or instructs violent extremist activity."],
        ["Direct incitement to imminent violence", "Specific calls to harm a specific person or group, right now — not commentary, criticism, or strong opinion."],
        ["Copyright infringement", "Handled through a standard takedown request process, not by us pre-screening your uploads."],
      ].map(([t, d]) => (
        <div key={t} style={styles.guidelineRow}>
          <div style={styles.guidelineTitle}>{t}</div>
          <div style={styles.guidelineDesc}>{d}</div>
        </div>
      ))}
      <p style={styles.guidelinesIntro}>
        Opinions, criticism, satire, controversial takes, mature themes discussed openly — all of
        that is yours to post. No demonetization for unpopular views, no shadow limits on reach.
      </p>
      <div style={styles.guidelineRow}>
        <div style={styles.guidelineTitle}>Age requirements</div>
        <div style={styles.guidelineDesc}>
          You must be 13 or older to create a channel. The 18+ flag is for mature themes — strong
          language, frightening or intense content, adult topics discussed in words — not for
          sexually explicit material, which isn't allowed at any age. Flagged content is hidden
          from anyone not signed in as an adult account — self-reported at signup, the same way
          most platforms handle it.
        </div>
      </div>
    </div>
  );
}

function CriticUpgradeModal({ onClose, onConfirm }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...styles.sectionLabel, textAlign: "center" }}>BECOME A VERIFIED CRITIC</div>
        <h2 style={{ ...styles.h2, textAlign: "center" }}>Your rating, verified.</h2>
        <p style={styles.guidelinesIntro}>
          Anyone can rate a video — that's free, and stays free. Verified Critics get a badge next
          to their name, and their ratings feed a separate Critic Score shown alongside every
          video's community rating, so creators know what dedicated critics really think.
        </p>
        <div style={styles.modalNote}>
          Demo only — no real payment is collected here. In the real app, this connects to your
          supporter subscription.
        </div>
        <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={onConfirm}>Subscribe — $4.99/mo</button>
      </div>
    </div>
  );
}

const TIP_PRESETS = [3, 5, 10, 25];

function TipModal({ channel, onClose, onSubmit }) {
  const [amount, setAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  if (!channel) return null;
  const finalAmount = customAmount ? parseFloat(customAmount) : amount;
  const valid = finalAmount > 0;

  const submit = () => {
    if (!valid) return;
    onSubmit(finalAmount, message);
    setSent(true);
  };

  if (sent) {
    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...styles.sectionLabel, textAlign: "center" }}>THANK YOU</div>
          <p style={styles.guidelinesIntro}>
            Your ${finalAmount.toFixed(2)} tip to {channel.name} is on its way.
          </p>
          <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...styles.sectionLabel, textAlign: "center" }}>SEND A TIP</div>
        <h2 style={{ ...styles.h2, textAlign: "center" }}>Support {channel.name}</h2>
        <div style={styles.qualityRow}>
          {TIP_PRESETS.map((p) => (
            <button
              key={p}
              style={{ ...styles.qualityBtn, ...(!customAmount && amount === p ? styles.qualityBtnActive : {}) }}
              onClick={() => { setAmount(p); setCustomAmount(""); }}
            >
              ${p}
            </button>
          ))}
        </div>
        <input
          style={styles.textInput}
          type="number"
          min="1"
          step="1"
          placeholder="Or enter a custom amount"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
        />
        <input
          style={styles.textInput}
          placeholder="Add a message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div style={styles.modalNote}>
          Demo only — no real payment is collected here. In the real app, this is a one-time
          Stripe charge.
        </div>
        <button style={{ ...styles.primaryBtn, width: "100%", opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={submit}>
          Send ${valid ? finalAmount.toFixed(2) : "0.00"}
        </button>
      </div>
    </div>
  );
}

function SuperfanModal({ channel, onClose, onConfirm }) {
  if (!channel || channel.superfanPrice == null) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...styles.sectionLabel, textAlign: "center" }}>BECOME A SUPERFAN</div>
        <h2 style={{ ...styles.h2, textAlign: "center" }}>Support {channel.name} every month</h2>
        <p style={styles.guidelinesIntro}>
          A recurring monthly amount, set by {channel.name} — a steadier way to back a creator you
          watch regularly than a one-off tip, and cheaper per month than most subscription plans.
        </p>
        <div style={styles.modalNote}>
          Demo only — no real payment is collected here. In the real app, this is a recurring
          Stripe subscription you can cancel anytime.
        </div>
        <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={onConfirm}>
          Subscribe — ${channel.superfanPrice.toFixed(2)}/mo
        </button>
      </div>
    </div>
  );
}

function PlatformSupportModal({ onClose, onSubmit }) {
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [sent, setSent] = useState(false);

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;
  const valid = finalAmount > 0;

  const submit = () => {
    if (!valid) return;
    onSubmit(finalAmount);
    setSent(true);
  };

  if (sent) {
    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...styles.sectionLabel, textAlign: "center" }}>THANK YOU</div>
          <p style={styles.guidelinesIntro}>
            Your ${finalAmount.toFixed(2)} donation helps keep Home Planet TV running, ad-free and
            independent.
          </p>
          <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <TVMark size={44} />
        </div>
        <div style={{ ...styles.sectionLabel, textAlign: "center" }}>SUPPORT HOME PLANET TV</div>
        <p style={styles.guidelinesIntro}>
          This goes to the platform itself, not a creator — it helps cover hosting and keeps
          Home Planet TV free of third-party ads and the compromises that come with them.
        </p>
        <div style={styles.qualityRow}>
          {TIP_PRESETS.map((p) => (
            <button
              key={p}
              style={{ ...styles.qualityBtn, ...(!customAmount && amount === p ? styles.qualityBtnActive : {}) }}
              onClick={() => { setAmount(p); setCustomAmount(""); }}
            >
              ${p}
            </button>
          ))}
        </div>
        <input
          style={styles.textInput}
          type="number"
          min="1"
          step="1"
          placeholder="Or enter a custom amount"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
        />
        <div style={styles.modalNote}>
          Demo only — no real payment is collected here. In the real app, this is a one-time
          Stripe charge.
        </div>
        <button style={{ ...styles.primaryBtn, width: "100%", opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={submit}>
          Donate ${valid ? finalAmount.toFixed(2) : "0.00"}
        </button>
      </div>
    </div>
  );
}

function SignupModal({ name, setName, email, setEmail, birthdate, setBirthdate, error, stage, onClose, onSubmit }) {
  if (stage === "sent") {
    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <TVMark size={44} />
          </div>
          <div style={{ ...styles.sectionLabel, textAlign: "center" }}>CHECK YOUR EMAIL</div>
          <div style={styles.modalNote}>
            We sent a sign-in link to <strong>{email}</strong>. Open it on this device to finish
            creating your channel — no password needed.
          </div>
          <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={onClose}>Got it</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <TVMark size={44} />
        </div>
        <div style={{ ...styles.sectionLabel, textAlign: "center" }}>CLAIM YOUR CHANNEL</div>
        <input
          style={styles.textInput}
          placeholder="Your name or channel name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <input
          type="email"
          style={styles.textInput}
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label style={styles.fieldLabel}>Date of birth</label>
        <input
          type="date"
          style={styles.textInput}
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
        <div style={styles.ageNote}>
          You must be 13 or older to create a channel. Accounts under 18 won't see or post
          18+ flagged content. Your email is only used for account recovery and legal notices —
          never shown on your channel.
        </div>
        {error && <div style={styles.errorNote}>{error}</div>}
        <div style={styles.modalNote}>
          By continuing you agree this is your content to post, and to the platform's short list
          of guidelines. We'll email you a sign-in link — no password to remember.
        </div>
        <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={onSubmit} disabled={stage === "sending"}>
          {stage === "sending" ? "Sending link…" : "Create channel"}
        </button>
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; overflow-x: hidden; }
      button { font-family: inherit; cursor: pointer; transition: transform 0.15s ease; }
      button:hover { transform: translateY(-1px); }
      button:active { transform: translateY(0); }
      input:focus { outline: 2px solid #4FA391; outline-offset: 1px; }
      button:focus-visible { outline: 2px solid #4FA391; outline-offset: 2px; }
      @keyframes whv-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
      @keyframes whv-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @media (max-width: 600px) {
        .whv-navlinks { gap: 6px !important; }
        .whv-logotext-full { display: none; }
        .whv-logotext-short { display: inline; }
      }
      @media (max-width: 380px) {
        .whv-navlinks { gap: 2px !important; }
      }
      .whv-video-card { transition: transform 0.15s ease, box-shadow 0.15s ease; border-radius: 8px; }
      .whv-video-card:hover, .whv-video-card:active { transform: translateY(-3px); }
      .whv-video-card:hover .whv-thumb-inner, .whv-video-card:active .whv-thumb-inner { box-shadow: 0 10px 20px rgba(42,33,24,0.14); }
      .whv-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    `}</style>
  );
}

// ---------- styles ----------

const styles = {
  page: { minHeight: "100vh", background: "#F5EEDD", color: "#2A2118", fontFamily: "'Nunito Sans', sans-serif" },
  nav: { borderBottom: "2px solid #E3D6B8", position: "sticky", top: 0, background: "#F5EEDDee", backdropFilter: "blur(6px)", zIndex: 10 },
  navInner: { maxWidth: 1060, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", flexWrap: "wrap", rowGap: 8 },
  logo: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  logoText: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 21 },
  logoTextShort: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 19, display: "none" },
  navLinks: { display: "flex", alignItems: "center", gap: 16 },
  navLink: { background: "none", border: "none", color: "#5C5140", fontFamily: "'Fredoka', sans-serif", fontWeight: 500, fontSize: 13, padding: "8px 2px" },
  navBtn: { background: "#E8483B", color: "#F5EEDD", border: "none", borderRadius: 20, padding: "10px 18px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  uploadBtn: { display: "flex", alignItems: "center", gap: 8, background: "#E8A33D", color: "#2A2118", border: "none", borderRadius: 20, padding: "6px 16px 6px 8px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  uploadBtnLarge: { display: "flex", alignItems: "center", gap: 10, background: "#E8A33D", color: "#2A2118", border: "none", borderRadius: 24, padding: "10px 22px 10px 12px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 15 },
  liveBtn: { background: "none", border: "2px solid #E8483B", color: "#E8483B", borderRadius: 20, padding: "6px 14px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  liveBtnLarge: { display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "2px solid #E8483B", color: "#E8483B", borderRadius: 24, padding: "10px 22px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 15 },
  dashActionRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  dashHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 0 },
  settingsLink: { background: "none", border: "none", color: "#8C7F68", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 0" },

  hero: { position: "relative", maxWidth: 720, margin: "0 auto", padding: "clamp(48px,10vw,80px) 20px clamp(40px,8vw,60px)", textAlign: "center" },
  heroGlow: { position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", width: 340, maxWidth: "90vw", height: 200, background: "radial-gradient(circle, rgba(232,163,61,0.25), transparent 70%)", zIndex: -1 },
  eyebrow: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "clamp(20px,3.2vw,30px)", letterSpacing: "0.06em", color: "#B4703A", marginBottom: 16 },
  h1: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "clamp(34px,5.5vw,54px)", lineHeight: 1.1, margin: "0 0 20px", color: "#2A2118" },
  h2: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: "clamp(21px,4.5vw,26px)", margin: "0 0 14px" },
  sub: { fontSize: 17, lineHeight: 1.65, color: "#5C5140", maxWidth: 560, margin: "0 auto 34px" },
  heroBtns: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 40, flexWrap: "wrap" },
  primaryBtn: { background: "#E8483B", color: "#F5EEDD", border: "none", borderRadius: 24, padding: "13px 24px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14 },
  ghostBtn: { background: "#FFFFFF", color: "#2A2118", border: "2px solid #E3D6B8", borderRadius: 24, padding: "12px 24px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14 },
  pingRow: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  pingChip: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68", display: "flex", alignItems: "center", gap: 6, border: "1px solid #E3D6B8", background: "#FFFFFF", borderRadius: 20, padding: "5px 11px" },
  pingDot: { width: 5, height: 5, borderRadius: "50%", background: "#4FA391" },

  container: { maxWidth: 1060, margin: "0 auto", padding: "clamp(26px,6vw,40px) 20px clamp(50px,10vw,80px)" },
  sectionLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.16em", color: "#8C7F68", marginBottom: 18 },
  videoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 20 },
  videoCard: { cursor: "pointer" },
  thumb: { position: "relative", background: "#1F4C5C", border: "3px solid #E3D6B8", borderRadius: 8, aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  playTri: { width: 0, height: 0, borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: "14px solid #E8A33D", marginLeft: 4 },
  adultBadge: { position: "absolute", top: 8, right: 8, background: "#E8483B", color: "#F5EEDD", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500, padding: "2px 6px", borderRadius: 4 },
  videoTitle: { fontFamily: "'Fredoka', sans-serif", fontSize: 14, fontWeight: 500, marginBottom: 4 },
  videoMeta: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68" },
  cardHeartsRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 3 },
  cardRatingNum: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8C7F68" },
  cardRatingNumGold: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#B4703A" },
  emptyNote: { color: "#8C7F68", fontStyle: "italic", fontSize: 14 },

  tabRow: { display: "flex", gap: 8, marginBottom: 20 },
  tabBtn: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 20, padding: "8px 18px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13, color: "#8C7F68" },
  tabBtnActive: { background: "#2A2118", borderColor: "#2A2118", color: "#F5EEDD" },

  followRow: { display: "flex", alignItems: "center", gap: 14, marginTop: -12, marginBottom: 22 },
  followBtn: { background: "#E8483B", color: "#F5EEDD", border: "none", borderRadius: 20, padding: "7px 18px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  messageBtn: { background: "#FFFFFF", color: "#2A2118", border: "2px solid #E3D6B8", borderRadius: 20, padding: "6px 16px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  reportLink: { background: "none", border: "none", color: "#8C7F68", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 4px", textDecoration: "underline" },
  followBtnActive: { background: "#FFFFFF", color: "#2A2118", border: "2px solid #E3D6B8" },
  supportBtn: { background: "none", border: "2px solid #E8A33D", color: "#B4703A", borderRadius: 20, padding: "6px 14px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  tipBtn: { background: "#FAF1DC", color: "#B4703A", border: "2px solid #E8CE96", borderRadius: 20, padding: "6px 16px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  superfanBtn: { background: "#FFFFFF", color: "#8A6412", border: "2px solid #F0DBA4", borderRadius: 20, padding: "6px 16px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  superfanBtnActive: { background: "#F0DBA4", color: "#8A6412", border: "2px solid #F0DBA4" },
  tipRow: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 8, padding: "10px 14px", marginBottom: 8 },
  tipTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  tipFrom: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  tipAmount: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14, color: "#B4703A" },
  tipMessage: { fontSize: 13, color: "#2A2118", marginTop: 4 },
  tipTime: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8C7F68", marginTop: 4 },

  bellBtn: { background: "none", border: "none", fontSize: 18, padding: "4px 2px", lineHeight: 1 },
  bellBadge: { position: "absolute", top: -3, right: -4, background: "#E8483B", color: "#F5EEDD", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  notifOverlay: { position: "fixed", inset: 0, zIndex: 25, background: "transparent" },
  notifPanel: { position: "absolute", top: "140%", right: 0, width: 280, maxWidth: "85vw", background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 10, padding: 14, boxShadow: "0 10px 26px rgba(42,33,24,0.18)", zIndex: 30, maxHeight: 320, overflowY: "auto" },
  notifHeader: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.14em", color: "#8C7F68", marginBottom: 8 },
  notifEmpty: { fontSize: 13, color: "#8C7F68", fontStyle: "italic" },
  notifRow: { borderTop: "1px solid #E3D6B8", padding: "8px 0" },
  notifText: { fontSize: 13, lineHeight: 1.45, color: "#2A2118", marginBottom: 2 },
  notifTime: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8C7F68" },

  statRow: { display: "flex", flexWrap: "wrap", gap: 14 },
  statCard: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 10, padding: "14px 20px", minWidth: 120 },
  statNum: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 22, color: "#2A2118" },
  statLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68", marginTop: 2 },
  barRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 9 },
  barLabel: { width: "34%", fontSize: 12, color: "#5C5140", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  barTrack: { flex: 1, height: 10, background: "#E3D6B8", borderRadius: 6, overflow: "hidden" },
  barFill: { height: "100%", background: "linear-gradient(90deg, #E8A33D, #4FA391)", borderRadius: 6 },
  barValue: { width: 50, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68" },

  watchThumb: { position: "relative", background: "#1F4C5C", border: "3px solid #E3D6B8", borderRadius: 10, aspectRatio: "16/9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 18, gap: 12 },
  playTriBig: { width: 0, height: 0, borderTop: "20px solid transparent", borderBottom: "20px solid transparent", borderLeft: "30px solid #E8A33D", marginLeft: 8 },
  thumbNote: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8CA8AE" },
  videoPlayer: { width: "100%", display: "block", background: "#000", borderRadius: 10, border: "3px solid #E3D6B8", aspectRatio: "16/9" },
  fullscreenBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 20, padding: "8px 18px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13, color: "#2A2118", marginBottom: 20 },
  speedRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  speedBtn: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 14, padding: "7px 11px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#2A2118" },
  speedBtnActive: { background: "#2A2118", borderColor: "#2A2118", color: "#F5EEDD" },
  watchMetaRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" },
  channelChip: { display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 20, padding: "5px 14px 5px 5px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2A2118" },
  likeBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 24, padding: "10px 20px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, color: "#2A2118" },
  likeBtnActive: { background: "#FBE3DE", borderColor: "#E8483B", color: "#E8483B" },
  ratingBlock: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 10, padding: "16px 18px" },
  ratingAvgLine: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  ratingAvgNum: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 20, color: "#2A2118" },
  ratingHeartBtn: { cursor: "pointer", display: "inline-flex" },
  ratingRowLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68", marginBottom: 6 },
  ratingHeartsRow: { display: "flex", gap: 6 },
  criticScoreLine: { display: "flex", alignItems: "center", gap: 8, background: "#FAF1DC", border: "1px solid #E8CE96", borderRadius: 8, padding: "8px 12px", marginBottom: 14, flexWrap: "wrap" },
  criticBadge: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.06em", color: "#8A6412", background: "#F0DBA4", borderRadius: 4, padding: "2px 6px" },
  criticScoreNum: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, color: "#8A6412" },
  criticBadgeSmall: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.05em", color: "#8A6412", background: "#F0DBA4", borderRadius: 4, padding: "1px 5px", marginLeft: 6 },
  criticUpsellLink: { display: "block", marginTop: 12, background: "none", border: "none", color: "#B4703A", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textDecoration: "underline", padding: "6px 0", textAlign: "left" },
  cardLightDarkRow: { display: "flex", alignItems: "center", gap: 5, marginBottom: 3, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68" },
  toneBlock: { background: "linear-gradient(135deg, #FAF1DC, #8C7F68 52%, #1F2E38)", borderRadius: 10, padding: "16px 18px" },
  toneRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  starBtn: { flex: 1, minWidth: 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 24, padding: "10px 14px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13, color: "#5C5140" },
  starBtnActive: { background: "#F5EEDD", border: "2px solid #E8A33D", color: "#B4703A" },
  planetBtn: { flex: 1, minWidth: 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#8C7F68", border: "2px solid #8C7F68", borderRadius: 24, padding: "10px 14px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13, color: "#F5EEDD" },
  planetBtnActive: { background: "#5C5140", border: "2px solid #5C5140", color: "#FFFFFF" },
  blackholeBtn: { flex: 1, minWidth: 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#2A2118", border: "2px solid #2A2118", borderRadius: 24, padding: "10px 14px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13, color: "#C9BFA8" },
  blackholeBtnActive: { background: "#0F2E38", border: "2px solid #1F4C5C", color: "#F5EEDD" },
  toneCaption: { display: "inline-block", marginTop: 10, background: "rgba(245,238,221,0.9)", borderRadius: 6, padding: "4px 10px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#5C5140" },
  commentInputRow: { display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" },
  commentRow: { borderTop: "1px solid #E3D6B8", padding: "12px 0" },
  commentAuthor: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13, marginBottom: 2 },
  commentText: { fontSize: 14, lineHeight: 1.5, color: "#2A2118", marginBottom: 4 },
  commentTime: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68" },

  backLink: { background: "none", border: "none", color: "#B4703A", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, marginBottom: 20, padding: "6px 0" },
  channelHeader: { display: "flex", alignItems: "center", gap: 16, marginTop: -32, paddingLeft: 6 },
  channelAvatar: { width: 72, height: 72, borderRadius: "50%", background: "#E8483B", color: "#F5EEDD", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 26, border: "4px solid #F5EEDD", backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 },
  banner: { width: "100%", height: 150, borderRadius: 12, background: "linear-gradient(135deg, #E8A33D33, #1F4C5C33)", backgroundSize: "cover", backgroundPosition: "center", border: "2px solid #E3D6B8", marginBottom: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  bannerPlaceholder: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#8C7F68" },
  editHint: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#B4703A", marginTop: 4 },
  channelName: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 20 },
  channelNameRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planBadgeCreator: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.05em", color: "#3E7D74", background: "#DCEEE9", borderRadius: 4, padding: "2px 7px" },
  planBadgePro: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.05em", color: "#8A6412", background: "#F0DBA4", borderRadius: 4, padding: "2px 7px" },
  channelHandle: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#8C7F68", marginTop: 3 },

  uploadCard: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 10, padding: 26, maxWidth: 480 },
  dropZone: { border: "2px dashed #D8CBB0", borderRadius: 8, padding: "34px 16px", textAlign: "center", cursor: "pointer", fontSize: 13, color: "#8C7F68", marginBottom: 14 },
  textInput: { width: "100%", background: "#F5EEDD", border: "2px solid #E3D6B8", borderRadius: 8, padding: "12px 14px", color: "#2A2118", fontFamily: "'Nunito Sans', sans-serif", fontSize: 16, marginBottom: 14 },
  uploadNote: { fontSize: 12, color: "#8C7F68", lineHeight: 1.6, marginBottom: 18 },
  checkRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 },
  checkDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, transition: "background 0.3s" },

  guidelinesIntro: { fontSize: 15, lineHeight: 1.7, color: "#5C5140", maxWidth: 620, marginBottom: 26 },
  guidelineRow: { borderTop: "2px solid #E3D6B8", padding: "18px 0" },
  guidelineTitle: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 6 },
  guidelineDesc: { fontSize: 14, color: "#5C5140", lineHeight: 1.6, maxWidth: 560 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(42,33,24,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, padding: 20 },
  modal: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 12, padding: 26, width: "100%", maxWidth: 380 },
  modalNote: { fontSize: 12, color: "#8C7F68", lineHeight: 1.6, marginBottom: 18 },
  fieldLabel: { display: "block", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68", marginBottom: 6 },
  ageNote: { fontSize: 12, color: "#8C7F68", lineHeight: 1.6, marginBottom: 10 },
  errorNote: { fontSize: 13, color: "#E8483B", fontWeight: 600, marginBottom: 10 },

  pollCard: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 10, padding: 18, marginBottom: 14 },
  pollQuestion: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 12 },
  pollOptionRow: { position: "relative", border: "2px solid #E3D6B8", borderRadius: 8, padding: "10px 14px", marginBottom: 8, cursor: "pointer", overflow: "hidden" },
  pollOptionFill: { position: "absolute", inset: 0, background: "#F5EEDD", transition: "width 0.4s ease", zIndex: 0 },
  pollOptionLabel: { position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", fontSize: 14, color: "#2A2118" },
  pollMeta: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68", marginTop: 4 },

  conversationRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid #E3D6B8", cursor: "pointer" },
  conversationName: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14 },
  conversationPreview: { fontSize: 13, color: "#8C7F68", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  messageBubble: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 14, padding: "10px 16px", marginBottom: 8, maxWidth: "75%", fontSize: 14 },
  messageBubbleMe: { background: "#E8A33D", borderColor: "#E8A33D", color: "#2A2118", marginLeft: "auto" },

  liveDot: { width: 10, height: 10, borderRadius: "50%", background: "#E8483B", animation: "whv-blink 1.2s infinite" },
  liveChatBox: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 10, padding: 14, minHeight: 140, maxHeight: 220, overflowY: "auto" },
  liveChatLine: { fontSize: 13, color: "#2A2118", padding: "4px 0", borderBottom: "1px solid #F0E9D8" },
  endLiveBtn: { background: "#E8483B", color: "#F5EEDD", border: "none", borderRadius: 24, padding: "12px 24px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, width: "100%" },

  requestRow: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 8, padding: "12px 14px", marginBottom: 10 },
  requestTop: { display: "flex", justifyContent: "space-between", marginBottom: 4 },
  requestType: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.06em", color: "#8C7F68" },
  linkBtn: { background: "none", border: "none", color: "#B4703A", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, textDecoration: "underline", padding: "6px 0" },
  inlineLink: { background: "none", border: "none", color: "#B4703A", fontFamily: "inherit", fontSize: "inherit", textDecoration: "underline", padding: 0, cursor: "pointer" },
  pricingWhyBox: { background: "#FAF1DC", border: "1px solid #E8CE96", borderRadius: 10, padding: "16px 18px", marginBottom: 22 },
  requestStatus: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.04em", color: "#B4703A", background: "#F0DBA4", borderRadius: 4, padding: "1px 6px" },
  requestSubject: { fontSize: 14, color: "#2A2118", marginBottom: 4 },
  requestTime: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8C7F68" },

  settingsValue: { fontSize: 15, color: "#2A2118", marginBottom: 14 },
  dangerCard: { background: "#FDEDEA", border: "2px solid #E8483B33", borderRadius: 10, padding: 20 },
  dangerBtn: { background: "#E8483B", color: "#F5EEDD", border: "none", borderRadius: 24, padding: "12px 22px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, width: "100%", marginBottom: 10 },

  planBanner: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#F5EEDD", border: "1px solid #E3D6B8", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  planBannerLimit: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 400, fontSize: 11, color: "#8C7F68" },
  planBannerLink: { marginLeft: "auto", background: "none", border: "none", color: "#B4703A", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textDecoration: "underline", padding: "6px 2px" },
  qualityRow: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  qualityBtn: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 8, padding: "8px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2A2118" },
  qualityBtnActive: { background: "#2A2118", border: "2px solid #2A2118", color: "#F5EEDD" },
  qualityBtnLocked: { color: "#8C7F68", opacity: 0.7 },
  trimRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  trimTime: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8C7F68", width: 44, flexShrink: 0 },
  trimSlider: { flex: 1, accentColor: "#E8483B" },

  planGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16 },
  planCard: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 12, padding: 20 },
  planCardActive: { borderColor: "#E8A33D", background: "#FAF1DC" },
  planCardName: { fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 4 },
  planCardPrice: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 22, color: "#B4703A", marginBottom: 14 },
  planCardFeature: { fontSize: 13, color: "#5C5140", marginBottom: 6 },
  planCardBtn: { width: "100%", marginTop: 12, background: "#E8483B", color: "#F5EEDD", border: "none", borderRadius: 20, padding: "10px 16px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  planCardBtnCurrent: { width: "100%", marginTop: 12, background: "#FFFFFF", color: "#8C7F68", border: "2px solid #E3D6B8", borderRadius: 20, padding: "10px 16px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
};
