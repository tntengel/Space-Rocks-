import React, { useState, useRef, useEffect } from "react";
import { signUpWithEmail, loadUserProfile, subscribeToAuthChanges, signOut } from "./lib/auth";

// ---------- mock data ----------
// NOTE: channels/videos are still local mock data. Wiring the feed,
// channel pages, uploads, likes, comments, and follows to Supabase
// queries is a separate follow-up step (see docs/build-brief.md,
// "Build order" #4) — this pass wires up real sign-up/sign-in only.

const seedChannels = [
  {
    id: "c1",
    name: "Amara Osei",
    handle: "@amara",
    tagline: "Street food & city life, Accra",
    avatarUrl: null,
    bannerUrl: null,
    followers: 4200,
    videos: [
      { id: "v1", title: "Late-night jollof stalls near Osu", views: 12000, time: "2 days ago", likes: 340, comments: [
        { id: "cm1", author: "@rosam", text: "This looks incredible, need to try this spot!", time: "1 day ago" },
      ] },
      { id: "v2", title: "What $5 buys at Makola Market", views: 34000, time: "1 week ago", likes: 812, comments: [] },
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
    videos: [
      { id: "v3", title: "Why nobody covers this story", views: 8100, time: "5 hours ago", likes: 156, comments: [
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
    videos: [
      { id: "v4", title: "Fixing a leaking tap in 4 minutes", views: 91000, time: "3 weeks ago", likes: 2100, comments: [
        { id: "cm3", author: "@devnair", text: "Saved me a call-out fee, thank you!", time: "2 weeks ago" },
        { id: "cm4", author: "@amara", text: "Glad it helped!", time: "2 weeks ago" },
      ] },
      { id: "v5", title: "Tools I actually use", views: 22000, time: "1 month ago", likes: 430, comments: [] },
    ],
  },
];

function formatCount(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
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
        <text x="50" y="72" textAnchor="middle" fontFamily="'Fredoka', sans-serif" fontWeight="700" fontSize="22" fill="#E8483B">
          V
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

// ---------- the main-page mark: a little TV with WHV glowing on the screen ----------

function TVMark({ size = 40, label = "WHV", rec = true }) {
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
              fontSize: size * 0.34,
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
  const [authLoading, setAuthLoading] = useState(true);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSignup, setShowSignup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupBirthdate, setSignupBirthdate] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupStage, setSignupStage] = useState("form"); // "form" | "sending" | "sent"

  // Real Supabase session -> app user. Fires once on mount with any
  // existing session, then again after the magic-link redirect signs
  // the browser in (or on sign-out).
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (authUser) => {
      if (!authUser) {
        setUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const profile = await loadUserProfile(authUser.id);
        setUser(profile);
        setShowSignup(false);
        setSignupStage("form");
      } catch (err) {
        console.error("Failed to load user profile", err);
      } finally {
        setAuthLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeVideo = activeChannel?.videos.find((v) => v.id === activeVideoId);
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

  const toggleLike = (channelId, videoId) => {
    setChannels((cs) =>
      cs.map((c) =>
        c.id !== channelId
          ? c
          : {
              ...c,
              videos: c.videos.map((v) =>
                v.id !== videoId ? v : { ...v, liked: !v.liked, likes: (v.likes || 0) + (v.liked ? -1 : 1) }
              ),
            }
      )
    );
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
        onUpload={() => setView("upload")}
        onDashboard={() => setView("dashboard")}
        onSignIn={() => setShowSignup(true)}
        onSignOut={handleSignOut}
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
        />
      )}
      {view === "watch" && activeChannel && activeVideo && (
        <WatchPage
          channel={activeChannel}
          video={activeVideo}
          user={user}
          canViewAdult={!!user?.isAdult}
          onBack={() => setView("feed")}
          onOpenChannel={() => setView("channel")}
          onToggleLike={() => toggleLike(activeChannel.id, activeVideo.id)}
          onAddComment={(text) => addComment(activeChannel.id, activeVideo.id, text)}
          onNeedSignup={() => setShowSignup(true)}
        />
      )}
      {view === "dashboard" && user && (
        <Dashboard
          channel={channels.find((c) => c.id === user.channelId)}
          onUpload={() => setView("upload")}
          onUpdateChannel={(patch) => updateChannelMedia(user.channelId, patch)}
          onOpenVideo={openVideo}
        />
      )}
      {view === "upload" && (
        <UploadFlow
          disabled={!user}
          userIsAdult={!!user?.isAdult}
          onNeedSignup={() => setShowSignup(true)}
          onPublish={(video) => {
            const newVideoId = video.id;
            setChannels((cs) =>
              cs.map((c) =>
                c.id === user.channelId
                  ? { ...c, videos: [{ ...video, views: 0, time: "just now", likes: 0, comments: [] }, ...c.videos] }
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
                            : { ...v, likes: (v.likes || 0) + 1 }
                        ),
                      }
                )
              );
              pushNotification(doComment ? `${reactor.handle} commented on your video "${video.title}"` : `${reactor.handle} liked your video "${video.title}"`);
            }, 4500);
          }}
        />
      )}
      {view === "guidelines" && <Guidelines />}

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
    </div>
  );
}

// ---------- pieces ----------

function NavBar({ user, notifications, unreadCount, showNotifications, onToggleNotifications, onCloseNotifications, onHome, onFeed, onGuidelines, onUpload, onDashboard, onSignIn, onSignOut }) {
  return (
    <div style={styles.nav}>
      {showNotifications && <div style={styles.notifOverlay} onClick={onCloseNotifications} />}
      <div style={styles.navInner}>
        <div style={styles.logo} onClick={onHome}>
          <WorldMark size={30} />
          <span style={styles.logoText} className="whv-logotext-full">World Home Video</span>
          <span style={styles.logoTextShort} className="whv-logotext-short">WHV</span>
        </div>
        <div style={styles.navLinks} className="whv-navlinks">
          <button style={styles.navLink} onClick={onFeed}>Explore</button>
          <button style={styles.navLink} onClick={onGuidelines}>Guidelines</button>
          {user ? (
            <>
              <button style={styles.navLink} onClick={onDashboard}>My channel</button>
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
      <div style={styles.eyebrow}>WORLD HOME VIDEO</div>
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
          <div style={styles.channelName}>{channel.name}</div>
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
          <div key={v.id} style={styles.videoCard} className="whv-video-card" onClick={() => onOpenVideo(v.channel.id, v.id)}>
            <div style={styles.thumb} className="whv-thumb-inner">
              <span style={styles.playTri} />
              {v.isAdult && <span style={styles.adultBadge}>18+</span>}
            </div>
            <div style={styles.videoTitle} className="whv-clamp2">{v.title}</div>
            <div style={styles.videoMeta}>{v.channel.handle} · {formatCount(v.views)} views · ♥ {formatCount(v.likes)} · {v.time}</div>
          </div>
        ))}
        {allVideos.length === 0 && tab === "following" && (
          <div style={styles.emptyNote}>You're not following anyone yet — visit a channel and hit Follow.</div>
        )}
        {allVideos.length === 0 && tab === "all" && <div style={styles.emptyNote}>No videos match "{searchQuery}".</div>}
      </div>
    </div>
  );
}

function ChannelPage({ channel, canViewAdult, onBack, onOpenVideo, user, onToggleFollow, onNeedSignup }) {
  const videos = channel.videos.filter((v) => !v.isAdult || canViewAdult);
  const isOwn = user?.channelId === channel.id;
  const isFollowing = (user?.following || []).includes(channel.id);
  return (
    <div style={styles.container}>
      <button style={styles.backLink} onClick={onBack}>← back to explore</button>
      <ChannelHead channel={channel} editable={false} />
      <div style={styles.followRow}>
        <span style={styles.videoMeta}>{formatCount(channel.followers)} followers</span>
        {!isOwn && (
          <button
            style={{ ...styles.followBtn, ...(isFollowing ? styles.followBtnActive : {}) }}
            onClick={() => (user ? onToggleFollow(channel.id) : onNeedSignup())}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>
      <div style={styles.sectionLabel}>{videos.length} VIDEOS</div>
      <div style={styles.videoGrid}>
        {videos.map((v) => (
          <div key={v.id} style={styles.videoCard} className="whv-video-card" onClick={() => onOpenVideo(channel.id, v.id)}>
            <div style={styles.thumb} className="whv-thumb-inner">
              <span style={styles.playTri} />
              {v.isAdult && <span style={styles.adultBadge}>18+</span>}
            </div>
            <div style={styles.videoTitle} className="whv-clamp2">{v.title}</div>
            <div style={styles.videoMeta}>{formatCount(v.views)} views · ♥ {formatCount(v.likes)} · {v.time}</div>
          </div>
        ))}
        {videos.length === 0 && <div style={styles.emptyNote}>Nothing posted yet.</div>}
      </div>
    </div>
  );
}

function Dashboard({ channel, onUpload, onUpdateChannel, onOpenVideo }) {
  if (!channel) return null;
  const totalViews = channel.videos.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes = channel.videos.reduce((s, v) => s + (v.likes || 0), 0);
  const totalComments = channel.videos.reduce((s, v) => s + (v.comments || []).length, 0);
  const maxViews = Math.max(1, ...channel.videos.map((v) => v.views || 0));

  return (
    <div style={styles.container}>
      <div style={styles.sectionLabel}>YOUR CHANNEL</div>
      <ChannelHead
        channel={channel}
        editable
        onPickBanner={(url) => onUpdateChannel({ bannerUrl: url })}
        onPickAvatar={(url) => onUpdateChannel({ avatarUrl: url })}
      />
      <button style={styles.uploadBtnLarge} onClick={onUpload}>
        <TVMark size={26} rec={false} />
        Upload a video
      </button>

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
          <div style={styles.statNum}>{formatCount(totalLikes)}</div>
          <div style={styles.statLabel}>Total likes</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{totalComments}</div>
          <div style={styles.statLabel}>Comments</div>
        </div>
      </div>

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
          <div key={v.id} style={styles.videoCard} className="whv-video-card" onClick={() => onOpenVideo(channel.id, v.id)}>
            <div style={styles.thumb} className="whv-thumb-inner"><span style={styles.playTri} /></div>
            <div style={styles.videoTitle} className="whv-clamp2">{v.title}</div>
            <div style={styles.videoMeta}>{formatCount(v.views)} views · ♥ {formatCount(v.likes)} · 💬 {(v.comments || []).length} · {v.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchPage({ channel, video, user, canViewAdult, onBack, onOpenChannel, onToggleLike, onAddComment, onNeedSignup }) {
  const [commentText, setCommentText] = useState("");
  const videoRef = useRef(null);
  const blocked = video.isAdult && !canViewAdult;
  const comments = video.comments || [];

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
            <video ref={videoRef} src={video.videoUrl} controls playsInline style={styles.videoPlayer} />
            {video.isAdult && <span style={styles.adultBadge}>18+</span>}
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

          <button
            style={{ ...styles.likeBtn, ...(video.liked ? styles.likeBtnActive : {}) }}
            onClick={onToggleLike}
          >
            ♥ {formatCount(video.likes)}
          </button>

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
            <button style={styles.primaryBtn} onClick={submitComment}>Post</button>
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

function UploadFlow({ disabled, userIsAdult, onNeedSignup, onPublish }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [stage, setStage] = useState("form");
  const [stepIdx, setStepIdx] = useState(0);
  const fileRef = useRef(null);

  const runChecks = () => {
    if (disabled) { onNeedSignup(); return; }
    if (!title.trim()) return;
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
          onPublish({ id: "v" + Date.now(), title: title.trim(), isAdult, videoUrl: file ? URL.createObjectURL(file) : null });
        }, 500);
      }
    }, 900);
  };

  return (
    <div style={styles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <TVMark size={34} />
        <div style={styles.sectionLabel}>UPLOAD TO WORLD HOME VIDEO</div>
      </div>

      {stage === "form" && (
        <div style={styles.uploadCard}>
          <div style={styles.dropZone} onClick={() => fileRef.current?.click()}>
            {file ? file.name : "Click to choose a video file"}
            <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <input style={styles.textInput} placeholder="Give it a title" value={title} onChange={(e) => setTitle(e.target.value)} />

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
          <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={runChecks}>Publish</button>
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
        Opinions, criticism, satire, controversial takes, adult topics discussed openly — all of
        that is yours to post. No demonetization for unpopular views, no shadow limits on reach.
      </p>
      <div style={styles.guidelineRow}>
        <div style={styles.guidelineTitle}>Age requirements</div>
        <div style={styles.guidelineDesc}>
          You must be 13 or older to create a channel. Content flagged 18+ is hidden from
          anyone not signed in as an adult account — self-reported at signup, the same way most
          platforms handle it.
        </div>
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
  emptyNote: { color: "#8C7F68", fontStyle: "italic", fontSize: 14 },

  tabRow: { display: "flex", gap: 8, marginBottom: 20 },
  tabBtn: { background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 20, padding: "8px 18px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13, color: "#8C7F68" },
  tabBtnActive: { background: "#2A2118", borderColor: "#2A2118", color: "#F5EEDD" },

  followRow: { display: "flex", alignItems: "center", gap: 14, marginTop: -12, marginBottom: 22 },
  followBtn: { background: "#E8483B", color: "#F5EEDD", border: "none", borderRadius: 20, padding: "7px 18px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13 },
  followBtnActive: { background: "#FFFFFF", color: "#2A2118", border: "2px solid #E3D6B8" },

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
  watchMetaRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" },
  channelChip: { display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 20, padding: "5px 14px 5px 5px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2A2118" },
  likeBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "2px solid #E3D6B8", borderRadius: 24, padding: "10px 20px", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, color: "#2A2118" },
  likeBtnActive: { background: "#FBE3DE", borderColor: "#E8483B", color: "#E8483B" },
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
};
