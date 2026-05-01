// ============================================================
// UBG PRO — SOCIAL SYSTEM (Chat, Friends, DMs, Notifications)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // Elements - Global Chat
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatLoginPrompt = document.getElementById("chatLoginPrompt");
  const activeChatTitle = document.getElementById("activeChatTitle");
  const activeChatDesc = document.getElementById("activeChatDesc");

  // Elements - DMs
  const dmMessages = document.getElementById("dmMessages");
  const dmForm = document.getElementById("dmForm");
  const dmInput = document.getElementById("dmInput");
  const dmLoginPrompt = document.getElementById("dmLoginPrompt");
  const dmListDms = document.getElementById("dmListDms");
  const dmTitle = document.getElementById("dmTitle");
  const dmDesc = document.getElementById("dmDesc");
  const dmAddFriendTop = document.getElementById("dmAddFriendTop");

  // Elements - Notifications
  const notifBtn = document.getElementById("notifBtn");
  const notifModal = document.getElementById("notifModal");
  const closeNotifModal = document.getElementById("closeNotifModal");
  const notifList = document.getElementById("notifList");
  const notifCount = document.getElementById("notifCount");

  // Elements - Modals
  const friendModal = document.getElementById("friendModal");
  const closeFriendModal = document.getElementById("closeFriendModal");
  const sendFriendRequestBtn = document.getElementById("sendFriendRequestBtn");
  const friendUsernameInput = document.getElementById("friendUsernameInput");

  // Elements - Rooms (group chats)
  const createRoomBtn = document.getElementById("createRoomBtn");
  const joinRoomBtn = document.getElementById("joinRoomBtn");
  const roomList = document.getElementById("roomList");
  const roomModal = document.getElementById("roomModal");
  const closeRoomModal = document.getElementById("closeRoomModal");
  const roomModalTitle = document.getElementById("roomModalTitle");
  const roomNameGroup = document.getElementById("roomNameGroup");
  const roomCodeGroup = document.getElementById("roomCodeGroup");
  const roomNameInput = document.getElementById("roomNameInput");
  const roomCodeInput = document.getElementById("roomCodeInput");
  const roomActionBtn = document.getElementById("roomActionBtn");
  const globalChannelItem = document.querySelector('#channelList .channel-item[data-id="global"]');
  const roomHeaderActions = document.getElementById("roomHeaderActions");
  const roomCodeBadge = document.getElementById("roomCodeBadge");
  const leaveRoomBtn = document.getElementById("leaveRoomBtn");
  const deleteRoomBtn = document.getElementById("deleteRoomBtn");

  // State
  let currentDmFriend = null;
  let unsubscribeChat = null;
  let unsubscribeDms = null;
  let unsubscribeNotifs = null;
  let unsubscribeFriends = null;
  let unsubscribeRooms = null;
  // activeChannel is either { type: "global" } or { type: "room", id, name, code, owner }
  let activeChannel = { type: "global" };
  let roomModalMode = null; // "create" | "join"

  function getUsername() {
    const user = firebase.auth().currentUser;
    if (!user || !user.email) return null;
    // Always work with lowercase for database consistency
    return user.email.replace("@ubgpro.local", "").toLowerCase();
  }

  // ============================================================
  // SHARED CONSTANTS, ANTISPAM, IMAGE UPLOAD, AUTO-CLEAR HELPERS
  // ============================================================
  const MESSAGE_TTL_MS = 60 * 60 * 1000;     // 1 hour
  const CLEANUP_INTERVAL_MS = 60 * 1000;     // run cleanup every 60s
  const MIN_SEND_INTERVAL_MS = 800;          // min ms between sends
  const MAX_BURST = 5;                       // max sends...
  const BURST_WINDOW_MS = 10000;             // ...in this window
  const BURST_COOLDOWN_MS = 10000;           // cooldown after exceeding burst
  const MAX_DUPLICATES = 3;                  // block N+ identical sends in a row
  const MAX_MESSAGE_LEN = 500;
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5MB raw upload limit
  const IMAGE_MAX_DIM = 720;
  const IMAGE_QUALITY = 0.7;

  const sendHistory = [];
  let lastSendText = null;
  let duplicateCount = 0;
  let burstCooldownUntil = 0;
  let cleanupTimerId = null;

  // Reply / reactions state
  const REACTION_EMOJIS = ["👍","❤️","😂","😮","😢","🔥"];
  let chatReplyDraft = null; // { username, snippet }
  let dmReplyDraft = null;
  let openMenuEl = null;
  let openMenuOutsideHandler = null;

  function tsToMs(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    return 0;
  }

  function isExpired(ts) {
    const ms = tsToMs(ts);
    if (!ms) return false; // pending serverTimestamp — keep until it resolves
    return (Date.now() - ms) > MESSAGE_TTL_MS;
  }

  function checkAntispam(text) {
    const now = Date.now();
    if (now < burstCooldownUntil) {
      const wait = Math.ceil((burstCooldownUntil - now) / 1000);
      showToast(`Slow down — try again in ${wait}s`);
      return false;
    }
    if (sendHistory.length > 0 && (now - sendHistory[sendHistory.length - 1]) < MIN_SEND_INTERVAL_MS) {
      showToast("You're sending messages too fast");
      return false;
    }
    while (sendHistory.length && (now - sendHistory[0]) > BURST_WINDOW_MS) sendHistory.shift();
    if (sendHistory.length >= MAX_BURST) {
      burstCooldownUntil = now + BURST_COOLDOWN_MS;
      showToast(`Too many messages — wait ${BURST_COOLDOWN_MS / 1000}s`);
      return false;
    }
    if (text && text === lastSendText) {
      duplicateCount++;
      if (duplicateCount >= MAX_DUPLICATES) {
        showToast("Stop sending the same message");
        return false;
      }
    } else {
      duplicateCount = text ? 1 : 0;
      lastSendText = text || null;
    }
    sendHistory.push(now);
    return true;
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error("That isn't an image"));
      if (file.size > MAX_IMAGE_BYTES) return reject(new Error("Image is too large (max 5MB)"));
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(IMAGE_MAX_DIM / img.width, IMAGE_MAX_DIM / img.height, 1);
          const w = Math.max(1, Math.round(img.width * ratio));
          const h = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
        };
        img.onerror = () => reject(new Error("Couldn't read that image"));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Couldn't read that file"));
      reader.readAsDataURL(file);
    });
  }

  function buildMessageBody(msg) {
    if (msg.image) {
      return `<img class="chat-msg-image" src="${msg.image}" alt="image" />`;
    }
    return `<div class="chat-msg-text">${escapeHtml(msg.text || "")}</div>`;
  }

  async function cleanupOldMessages(ref) {
    try {
      const cutoff = firebase.firestore.Timestamp.fromMillis(Date.now() - MESSAGE_TTL_MS);
      const snap = await ref.where("timestamp", "<", cutoff).limit(50).get();
      if (snap.empty) return;
      const batch = db.batch();
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      // permission errors etc — silent
    }
  }

  function startCleanupTimer() {
    if (cleanupTimerId) return;
    const tick = () => {
      cleanupOldMessages(db.collection("messages"));
      if (activeChannel.type === "room") {
        cleanupOldMessages(db.collection("rooms").doc(activeChannel.id).collection("messages"));
      }
      const me = getUsername();
      if (me && currentDmFriend) {
        const dmId = [me, currentDmFriend].sort().join("_");
        cleanupOldMessages(db.collection("dms").doc(dmId).collection("messages"));
      }
    };
    tick();
    cleanupTimerId = setInterval(tick, CLEANUP_INTERVAL_MS);
  }

  function stopCleanupTimer() {
    if (cleanupTimerId) { clearInterval(cleanupTimerId); cleanupTimerId = null; }
  }

  // ============================================================
  // REPLY + REACTIONS HELPERS
  // ============================================================
  function snippetForReply(msg) {
    if (msg.image) return "📷 Image";
    return (msg.text || "").slice(0, 80);
  }

  function renderReplyQuote(replyTo) {
    if (!replyTo) return "";
    return `<div class="chat-msg-reply-quote">
      <span class="reply-user"><i class="fas fa-reply"></i> ${escapeHtml(replyTo.username || "")}</span>
      <span class="reply-text">${escapeHtml(replyTo.snippet || "")}</span>
    </div>`;
  }

  function renderReactions(reactions, me) {
    if (!reactions) return "";
    const entries = Object.entries(reactions).filter(([, users]) => Array.isArray(users) && users.length > 0);
    if (entries.length === 0) return "";
    return `<div class="chat-msg-reactions">${
      entries.map(([emoji, users]) => {
        const mine = me && users.includes(me) ? "mine" : "";
        return `<button class="chat-reaction-pill ${mine}" data-emoji="${escapeHtml(emoji)}"><span>${escapeHtml(emoji)}</span><span class="chat-reaction-count">${users.length}</span></button>`;
      }).join("")
    }</div>`;
  }

  function closeMsgMenu() {
    if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; }
    if (openMenuOutsideHandler) {
      document.removeEventListener("click", openMenuOutsideHandler, true);
      openMenuOutsideHandler = null;
    }
  }

  function openMsgMenu(anchor, msgRef, msg, kind) {
    closeMsgMenu();
    const me = getUsername();
    if (!me) { showToast("Login to react or reply"); return; }
    const popover = document.createElement("div");
    popover.className = "msg-menu-popover";
    popover.innerHTML = `
      <div class="msg-menu-reactions">
        ${REACTION_EMOJIS.map(e => `<button type="button" class="msg-menu-emoji" data-emoji="${e}" title="React with ${e}">${e}</button>`).join("")}
      </div>
      <div class="msg-menu-divider"></div>
      <button type="button" class="msg-menu-item" data-action="reply"><i class="fas fa-reply"></i> Reply</button>
    `;
    document.body.appendChild(popover);
    const r = anchor.getBoundingClientRect();
    const pw = popover.offsetWidth || 200;
    const ph = popover.offsetHeight || 80;
    let top = r.bottom + 4;
    let left = Math.max(8, r.right - pw);
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 4);
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    popover.style.top = top + "px";
    popover.style.left = left + "px";

    popover.querySelectorAll(".msg-menu-emoji").forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleReaction(msgRef, msg, b.dataset.emoji, me);
        closeMsgMenu();
      });
    });
    popover.querySelector('[data-action="reply"]').addEventListener("click", (e) => {
      e.stopPropagation();
      setReplyDraft(kind, { username: msg.username || "", snippet: snippetForReply(msg) });
      closeMsgMenu();
    });

    openMenuEl = popover;
    setTimeout(() => {
      openMenuOutsideHandler = (ev) => {
        if (!popover.contains(ev.target)) closeMsgMenu();
      };
      document.addEventListener("click", openMenuOutsideHandler, true);
    }, 0);
  }

  async function toggleReaction(msgRef, msg, emoji, me) {
    const existing = (msg.reactions && msg.reactions[emoji]) || [];
    const has = existing.includes(me);
    try {
      await msgRef.update({
        [`reactions.${emoji}`]: has
          ? firebase.firestore.FieldValue.arrayRemove(me)
          : firebase.firestore.FieldValue.arrayUnion(me)
      });
    } catch (e) {
      // doc may not have a reactions map yet — set fresh with merge
      try {
        await msgRef.set({ reactions: { [emoji]: has ? [] : [me] } }, { merge: true });
      } catch (err) {
        showToast("Couldn't react");
      }
    }
  }

  function setReplyDraft(kind, draft) {
    if (kind === "chat") { chatReplyDraft = draft; renderChatReplyBar(); }
    else { dmReplyDraft = draft; renderDmReplyBar(); }
  }

  function renderChatReplyBar() {
    const bar = document.getElementById("chatReplyBar");
    if (!bar) return;
    if (!chatReplyDraft) { bar.classList.remove("active"); bar.innerHTML = ""; return; }
    bar.classList.add("active");
    bar.innerHTML = `
      <div class="reply-preview-text"><i class="fas fa-reply"></i> Replying to <b>${escapeHtml(chatReplyDraft.username)}</b><span class="reply-preview-snippet">${escapeHtml(chatReplyDraft.snippet)}</span></div>
      <button type="button" class="cancel-reply" id="chatCancelReply" title="Cancel reply"><i class="fas fa-times"></i></button>
    `;
    const c = document.getElementById("chatCancelReply");
    if (c) c.addEventListener("click", () => setReplyDraft("chat", null));
  }

  function renderDmReplyBar() {
    const bar = document.getElementById("dmReplyBar");
    if (!bar) return;
    if (!dmReplyDraft) { bar.classList.remove("active"); bar.innerHTML = ""; return; }
    bar.classList.add("active");
    bar.innerHTML = `
      <div class="reply-preview-text"><i class="fas fa-reply"></i> Replying to <b>${escapeHtml(dmReplyDraft.username)}</b><span class="reply-preview-snippet">${escapeHtml(dmReplyDraft.snippet)}</span></div>
      <button type="button" class="cancel-reply" id="dmCancelReply" title="Cancel reply"><i class="fas fa-times"></i></button>
    `;
    const c = document.getElementById("dmCancelReply");
    if (c) c.addEventListener("click", () => setReplyDraft("dm", null));
  }

  function attachMessageMenu(msgEl, msgRef, msg, kind) {
    const wrap = document.createElement("div");
    wrap.className = "chat-msg-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chat-msg-action-btn";
    btn.title = "More";
    btn.innerHTML = `<i class="fas fa-ellipsis-h"></i>`;
    wrap.appendChild(btn);
    msgEl.appendChild(wrap);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openMsgMenu(btn, msgRef, msg, kind);
    });
    msgEl.querySelectorAll(".chat-reaction-pill").forEach(p => {
      p.addEventListener("click", (e) => {
        e.stopPropagation();
        const me = getUsername();
        if (!me) { showToast("Login to react"); return; }
        toggleReaction(msgRef, msg, p.dataset.emoji, me);
      });
    });
  }

  // ============================================================
  // GLOBAL CHAT LOGIC
  // ============================================================

  function getActiveMessagesRef() {
    if (activeChannel.type === "room") {
      return db.collection("rooms").doc(activeChannel.id).collection("messages");
    }
    return db.collection("messages");
  }

  function renderActiveChannelHeader() {
    if (!activeChatTitle || !activeChatDesc) return;
    if (activeChannel.type === "room") {
      activeChatTitle.innerHTML = `<i class="fas fa-users"></i> ${escapeHtml(activeChannel.name)}`;
      activeChatDesc.textContent = "Private group chat — share the code to invite others";
      if (roomHeaderActions) roomHeaderActions.style.display = "flex";
      if (roomCodeBadge) roomCodeBadge.textContent = `Code: ${activeChannel.code}`;
      const me = getUsername();
      if (deleteRoomBtn) deleteRoomBtn.style.display = (me && me === activeChannel.owner) ? "inline-flex" : "none";
    } else {
      activeChatTitle.innerHTML = `<i class="fas fa-globe"></i> Global Chat`;
      activeChatDesc.textContent = "Chat with other players on UBGPro in real-time!";
      if (roomHeaderActions) roomHeaderActions.style.display = "none";
    }
  }

  function setActiveChannel(channel) {
    activeChannel = channel;
    // clear any reply-in-progress when switching channels
    if (chatReplyDraft) { chatReplyDraft = null; renderChatReplyBar(); }
    closeMsgMenu();
    // Highlight in sidebar
    document.querySelectorAll('#channelList .channel-item, #roomList .channel-item').forEach(el => el.classList.remove('active'));
    if (channel.type === "global" && globalChannelItem) {
      globalChannelItem.classList.add('active');
    } else if (channel.type === "room") {
      const el = document.querySelector(`#roomList .channel-item[data-room-id="${channel.id}"]`);
      if (el) el.classList.add('active');
    }
    renderActiveChannelHeader();
    initActiveChannelMessages();
  }

  function initActiveChannelMessages() {
    if (unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; }
    const ref = getActiveMessagesRef();
    const query = ref.orderBy("timestamp", "desc").limit(50);

    unsubscribeChat = query.onSnapshot((snapshot) => {
      if (!chatMessages) return;
      const me = getUsername();
      const msgs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (isExpired(data.timestamp)) return; // hide messages older than TTL
        msgs.push({ id: doc.id, msg: data });
      });
      msgs.reverse();

      chatMessages.innerHTML = "";
      if (msgs.length === 0) {
        chatMessages.innerHTML = `<p class="chat-empty-state">No recent messages — chats clear every hour.</p>`;
        return;
      }

      msgs.forEach(({ id, msg }) => {
        const msgEl = document.createElement("div");
        msgEl.className = "chat-msg";
        if (me && msg.username && me === msg.username.toLowerCase()) msgEl.classList.add("me");
        msgEl.innerHTML = `
          ${renderReplyQuote(msg.replyTo)}
          <div class="chat-msg-header">
            <span class="chat-msg-user">${escapeHtml(msg.username || "")}</span>
            <span class="chat-msg-time">${formatTime(msg.timestamp)}</span>
          </div>
          ${buildMessageBody(msg)}
          ${renderReactions(msg.reactions, me)}
        `;
        chatMessages.appendChild(msgEl);
        attachMessageMenu(msgEl, ref.doc(id), msg, "chat");
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, (error) => console.error("Chat sync error:", error));
  }

  // Backwards-compatible name
  function initGlobalChat() {
    setActiveChannel({ type: "global" });
  }

  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const me = getUsername();
      if (!me) { showToast("You must be logged in to chat"); return; }
      const text = chatInput.value.trim();
      if (!text) return;
      if (text.length > MAX_MESSAGE_LEN) { showToast(`Message too long (max ${MAX_MESSAGE_LEN})`); return; }
      if (!checkAntispam(text)) return;
      chatInput.value = "";
      const payload = {
        username: me,
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (chatReplyDraft) { payload.replyTo = chatReplyDraft; setReplyDraft("chat", null); }
      getActiveMessagesRef().add(payload);
    });
  }

  // Image upload — global / room chat
  const chatImageBtn = document.getElementById("chatImageBtn");
  const chatImageInput = document.getElementById("chatImageInput");
  if (chatImageBtn && chatImageInput) {
    chatImageBtn.addEventListener("click", () => {
      const me = getUsername();
      if (!me) { showToast("You must be logged in to send images"); return; }
      chatImageInput.click();
    });
    chatImageInput.addEventListener("change", async () => {
      const file = chatImageInput.files && chatImageInput.files[0];
      chatImageInput.value = "";
      if (!file) return;
      const me = getUsername();
      if (!me) return;
      if (!checkAntispam("[image]")) return;
      try {
        const dataUrl = await compressImage(file);
        const payload = {
          username: me,
          image: dataUrl,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (chatReplyDraft) { payload.replyTo = chatReplyDraft; setReplyDraft("chat", null); }
        await getActiveMessagesRef().add(payload);
      } catch (err) {
        showToast(err.message || "Couldn't send image");
      }
    });
  }

  if (globalChannelItem) {
    globalChannelItem.addEventListener("click", () => setActiveChannel({ type: "global" }));
  }

  // ============================================================
  // GROUP CHATS / ROOMS
  // ============================================================

  function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  function openRoomModal(mode) {
    if (!roomModal) return;
    const me = getUsername();
    if (!me) { showToast("You must be logged in to use group chats"); return; }
    roomModalMode = mode;
    if (mode === "create") {
      if (roomModalTitle) roomModalTitle.textContent = "Create Group Chat";
      if (roomNameGroup) roomNameGroup.style.display = "block";
      if (roomCodeGroup) roomCodeGroup.style.display = "none";
      if (roomActionBtn) roomActionBtn.innerHTML = 'Create <i class="fas fa-plus"></i>';
      if (roomNameInput) roomNameInput.value = "";
    } else {
      if (roomModalTitle) roomModalTitle.textContent = "Join Group Chat";
      if (roomNameGroup) roomNameGroup.style.display = "none";
      if (roomCodeGroup) roomCodeGroup.style.display = "block";
      if (roomActionBtn) roomActionBtn.innerHTML = 'Join <i class="fas fa-sign-in-alt"></i>';
      if (roomCodeInput) roomCodeInput.value = "";
    }
    roomModal.classList.add("open");
  }

  function closeRoomModalFn() {
    if (roomModal) roomModal.classList.remove("open");
    roomModalMode = null;
  }

  async function createRoom(name) {
    const me = getUsername();
    if (!me) { showToast("You must be logged in"); return; }
    const trimmedName = (name || "").trim();
    if (trimmedName.length < 2) { showToast("Room name is too short"); return; }
    if (trimmedName.length > 40) { showToast("Room name is too long (max 40 characters)"); return; }
    const nameLower = trimmedName.toLowerCase();

    // Duplicate name check (case-insensitive)
    try {
      const dupSnap = await db.collection("rooms").where("nameLower", "==", nameLower).limit(1).get();
      if (!dupSnap.empty) { showToast(`A group named "${trimmedName}" already exists`); return; }
    } catch (e) {
      console.error("Duplicate-name check failed:", e);
    }

    // Generate a unique code (retry a few times on collision)
    let code = null;
    for (let i = 0; i < 5; i++) {
      const candidate = generateRoomCode();
      const existing = await db.collection("rooms").where("code", "==", candidate).limit(1).get();
      if (existing.empty) { code = candidate; break; }
    }
    if (!code) { showToast("Couldn't generate a code, try again"); return; }

    const docRef = await db.collection("rooms").add({
      name: trimmedName,
      nameLower: nameLower,
      code: code,
      owner: me,
      members: [me],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`Group "${trimmedName}" created — code: ${code}`);
    closeRoomModalFn();
    setActiveChannel({ type: "room", id: docRef.id, name: trimmedName, code: code, owner: me });
  }

  async function joinRoomByCode(code) {
    const me = getUsername();
    if (!me) { showToast("You must be logged in"); return; }
    if (!code) { showToast("Enter a room code"); return; }
    const normalized = code.trim().toUpperCase();
    const snap = await db.collection("rooms").where("code", "==", normalized).limit(1).get();
    if (snap.empty) { showToast("No group found with that code"); return; }
    const doc = snap.docs[0];
    const data = doc.data();
    if (data.members && data.members.includes(me)) {
      showToast(`Already a member of "${data.name}"`);
    } else {
      await doc.ref.update({
        members: firebase.firestore.FieldValue.arrayUnion(me)
      });
      showToast(`Joined "${data.name}"!`);
    }
    closeRoomModalFn();
    setActiveChannel({ type: "room", id: doc.id, name: data.name, code: data.code, owner: data.owner });
  }

  async function leaveCurrentRoom() {
    const me = getUsername();
    if (!me || activeChannel.type !== "room") return;
    if (me === activeChannel.owner) {
      showToast("You're the owner — delete the group instead");
      return;
    }
    if (!confirm(`Leave "${activeChannel.name}"?`)) return;
    await db.collection("rooms").doc(activeChannel.id).update({
      members: firebase.firestore.FieldValue.arrayRemove(me)
    });
    showToast(`Left "${activeChannel.name}"`);
    setActiveChannel({ type: "global" });
  }

  async function deleteCurrentRoom() {
    const me = getUsername();
    if (!me || activeChannel.type !== "room") return;
    if (me !== activeChannel.owner) {
      showToast("Only the owner can delete this group");
      return;
    }
    if (!confirm(`Delete "${activeChannel.name}"? This cannot be undone.`)) return;
    const roomId = activeChannel.id;
    // Delete messages subcollection in batches
    try {
      const msgsSnap = await db.collection("rooms").doc(roomId).collection("messages").get();
      const batch = db.batch();
      msgsSnap.forEach(d => batch.delete(d.ref));
      batch.delete(db.collection("rooms").doc(roomId));
      await batch.commit();
      showToast(`Deleted "${activeChannel.name}"`);
      setActiveChannel({ type: "global" });
    } catch (err) {
      console.error("Delete room error:", err);
      showToast("Failed to delete group");
    }
  }

  function initRoomsList() {
    if (unsubscribeRooms) unsubscribeRooms();
    const me = getUsername();
    if (!me || !roomList) return;
    unsubscribeRooms = db.collection("rooms")
      .where("members", "array-contains", me)
      .onSnapshot(snapshot => {
        roomList.innerHTML = "";
        if (snapshot.empty) {
          roomList.innerHTML = `<p style="text-align:center; opacity:0.5; padding:12px; font-size:0.85rem;">No groups yet. Create one or join with a code.</p>`;
        }
        let activeStillExists = false;
        snapshot.forEach(doc => {
          const data = doc.data();
          if (activeChannel.type === "room" && activeChannel.id === doc.id) {
            activeStillExists = true;
            // Refresh cached metadata in case it changed
            activeChannel.name = data.name;
            activeChannel.code = data.code;
            activeChannel.owner = data.owner;
          }
          const el = document.createElement("div");
          el.className = "channel-item room-item";
          el.dataset.roomId = doc.id;
          if (activeChannel.type === "room" && activeChannel.id === doc.id) el.classList.add('active');
          const initial = (data.name || "?").charAt(0).toUpperCase();
          const memberCount = (data.members || []).length;
          const ownerBadge = data.owner === me ? '<i class="fas fa-crown" title="You own this group"></i>' : '';
          el.innerHTML = `
            <div class="room-avatar">${escapeHtml(initial)}</div>
            <div class="channel-item-body">
              <div class="channel-item-name">${escapeHtml(data.name)} ${ownerBadge}</div>
              <div class="channel-item-meta">${memberCount} member${memberCount === 1 ? '' : 's'}</div>
            </div>
          `;
          el.addEventListener("click", () => setActiveChannel({
            type: "room", id: doc.id, name: data.name, code: data.code, owner: data.owner
          }));
          roomList.appendChild(el);
        });
        // If the active room got deleted out from under us, fall back to global
        if (activeChannel.type === "room" && !activeStillExists) {
          setActiveChannel({ type: "global" });
        } else if (activeChannel.type === "room") {
          renderActiveChannelHeader();
        }
      }, (error) => console.error("Rooms sync error:", error));
  }

  if (createRoomBtn) createRoomBtn.addEventListener("click", () => openRoomModal("create"));
  if (joinRoomBtn) joinRoomBtn.addEventListener("click", () => openRoomModal("join"));
  if (closeRoomModal) closeRoomModal.addEventListener("click", closeRoomModalFn);
  if (roomModal) roomModal.addEventListener("click", (e) => {
    if (e.target === roomModal) closeRoomModalFn();
  });
  let roomActionInFlight = false;
  if (roomActionBtn) roomActionBtn.addEventListener("click", async () => {
    if (roomActionInFlight) return; // prevent duplicate creates / joins from rapid clicks
    roomActionInFlight = true;
    const originalLabel = roomActionBtn.innerHTML;
    roomActionBtn.disabled = true;
    roomActionBtn.classList.add("is-loading");
    roomActionBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Working...`;
    try {
      if (roomModalMode === "create") {
        await createRoom(roomNameInput ? roomNameInput.value : "");
      } else if (roomModalMode === "join") {
        await joinRoomByCode(roomCodeInput ? roomCodeInput.value : "");
      }
    } catch (err) {
      console.error("Room action error:", err);
      showToast("Something went wrong, try again");
    } finally {
      roomActionInFlight = false;
      roomActionBtn.disabled = false;
      roomActionBtn.classList.remove("is-loading");
      roomActionBtn.innerHTML = originalLabel;
    }
  });
  if (leaveRoomBtn) leaveRoomBtn.addEventListener("click", leaveCurrentRoom);
  if (deleteRoomBtn) deleteRoomBtn.addEventListener("click", deleteCurrentRoom);
  if (roomCodeBadge) roomCodeBadge.addEventListener("click", () => {
    if (activeChannel.type === "room" && activeChannel.code) {
      navigator.clipboard?.writeText(activeChannel.code);
      showToast(`Code ${activeChannel.code} copied to clipboard`);
    }
  });

  // ============================================================
  // DM LOGIC
  // ============================================================

  function openDm(friend) {
    currentDmFriend = friend.toLowerCase();
    if (dmReplyDraft) { dmReplyDraft = null; renderDmReplyBar(); }
    closeMsgMenu();
    dmTitle.innerHTML = `<i class="fas fa-user"></i> ${friend}`;
    dmDesc.textContent = "Secure Private Chat";
    
    // Explicitly update visibility
    const user = firebase.auth().currentUser;
    if (user) {
      if (dmForm) dmForm.style.display = "flex";
      if (dmLoginPrompt) dmLoginPrompt.style.display = "none";
    } else {
      if (dmForm) dmForm.style.display = "none";
      if (dmLoginPrompt) dmLoginPrompt.style.display = "flex";
    }
    
    dmAddFriendTop.style.display = "none";

    document.querySelectorAll("#dmListDms .channel-item").forEach(item => {
      item.classList.toggle("active", item.dataset.user.toLowerCase() === currentDmFriend);
    });

    initDmMessages();
  }

  function initDmMessages() {
    if (unsubscribeDms) unsubscribeDms();
    const me = getUsername();
    if (!me || !currentDmFriend) return;

    const dmId = [me, currentDmFriend].sort().join("_");
    const query = db.collection("dms").doc(dmId).collection("messages")
      .orderBy("timestamp", "desc").limit(50);

    const dmRef = db.collection("dms").doc(dmId).collection("messages");
    unsubscribeDms = query.onSnapshot((snapshot) => {
      if (!dmMessages) return;
      const msgs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (isExpired(data.timestamp)) return;
        msgs.push({ id: doc.id, msg: data });
      });
      msgs.reverse();

      dmMessages.innerHTML = "";
      if (msgs.length === 0) {
        dmMessages.innerHTML = `<p class="chat-empty-state">No recent messages — chats clear every hour.</p>`;
        return;
      }

      msgs.forEach(({ id, msg }) => {
        const msgEl = document.createElement("div");
        msgEl.className = "chat-msg";
        if (msg.username && me === msg.username.toLowerCase()) msgEl.classList.add("me");
        msgEl.innerHTML = `
          ${renderReplyQuote(msg.replyTo)}
          <div class="chat-msg-header">
            <span class="chat-msg-user">${escapeHtml(msg.username || "")}</span>
            <span class="chat-msg-time">${formatTime(msg.timestamp)}</span>
          </div>
          ${buildMessageBody(msg)}
          ${renderReactions(msg.reactions, me)}
        `;
        dmMessages.appendChild(msgEl);
        attachMessageMenu(msgEl, dmRef.doc(id), msg, "dm");
      });
      dmMessages.scrollTop = dmMessages.scrollHeight;
    });
  }

  if (dmForm) {
    dmForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const me = getUsername();
      if (!me || !currentDmFriend) return;
      const text = dmInput.value.trim();
      if (!text) return;
      if (text.length > MAX_MESSAGE_LEN) { showToast(`Message too long (max ${MAX_MESSAGE_LEN})`); return; }
      if (!checkAntispam(text)) return;
      dmInput.value = "";
      const dmId = [me, currentDmFriend].sort().join("_");
      const payload = {
        username: me,
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (dmReplyDraft) { payload.replyTo = dmReplyDraft; setReplyDraft("dm", null); }
      db.collection("dms").doc(dmId).collection("messages").add(payload);
    });
  }

  // Image upload — DM
  const dmImageBtn = document.getElementById("dmImageBtn");
  const dmImageInput = document.getElementById("dmImageInput");
  if (dmImageBtn && dmImageInput) {
    dmImageBtn.addEventListener("click", () => {
      const me = getUsername();
      if (!me || !currentDmFriend) { showToast("Open a DM first"); return; }
      dmImageInput.click();
    });
    dmImageInput.addEventListener("change", async () => {
      const file = dmImageInput.files && dmImageInput.files[0];
      dmImageInput.value = "";
      if (!file) return;
      const me = getUsername();
      if (!me || !currentDmFriend) return;
      if (!checkAntispam("[image]")) return;
      try {
        const dataUrl = await compressImage(file);
        const dmId = [me, currentDmFriend].sort().join("_");
        const payload = {
          username: me,
          image: dataUrl,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (dmReplyDraft) { payload.replyTo = dmReplyDraft; setReplyDraft("dm", null); }
        await db.collection("dms").doc(dmId).collection("messages").add(payload);
      } catch (err) {
        showToast(err.message || "Couldn't send image");
      }
    });
  }

  // ============================================================
  // NOTIFICATIONS & FRIENDS
  // ============================================================

  function initSocial() {
    const me = getUsername();
    if (!me) return;

    // Notifications (Incoming Requests)
    if (unsubscribeNotifs) unsubscribeNotifs();
    unsubscribeNotifs = db.collection("friendRequests")
      .where("to", "==", me)
      .where("status", "==", "pending")
      .onSnapshot(snapshot => {
        notifCount.textContent = snapshot.size;
        notifCount.style.display = snapshot.size > 0 ? "flex" : "none";

        notifList.innerHTML = snapshot.empty 
          ? `<p style="text-align:center; opacity:0.5; padding: 20px;">No new notifications</p>`
          : "";

        snapshot.forEach(doc => {
          const req = doc.data();
          const el = document.createElement("div");
          el.className = "notif-item";
          el.innerHTML = `
            <span><i class="fas fa-user-plus" style="color:var(--accent); margin-right:8px;"></i> <b>${req.from}</b> wants to be friends</span>
            <div class="notif-actions">
              <button class="btn-accept" data-id="${doc.id}" data-from="${req.from}"><i class="fas fa-check"></i></button>
              <button class="btn-reject" data-id="${doc.id}"><i class="fas fa-times"></i></button>
            </div>
          `;
          notifList.appendChild(el);
        });

        notifList.querySelectorAll(".btn-accept").forEach(b => b.addEventListener("click", () => acceptRequest(b.dataset.id, b.dataset.from)));
        notifList.querySelectorAll(".btn-reject").forEach(b => b.addEventListener("click", () => rejectRequest(b.dataset.id)));
      });

    // Friends List Sync
    if (unsubscribeFriends) unsubscribeFriends();
    unsubscribeFriends = db.collection("friends")
      .where("users", "array-contains", me)
      .onSnapshot(snapshot => {
        console.log("Friends list sync:", snapshot.size, "records");
        dmListDms.innerHTML = "";
        
        if (snapshot.empty) {
          dmAddFriendTop.style.display = "block";
          dmDesc.textContent = "No friends yet. Add some to start chatting!";
        } else {
          dmAddFriendTop.style.display = "none";
          snapshot.forEach(doc => {
            const data = doc.data();
            const friend = data.users.find(u => u.toLowerCase() !== me);
            if (!friend) return;
            
            const el = document.createElement("div");
            el.className = "channel-item";
            el.dataset.user = friend;
            el.innerHTML = `<i class="fas fa-user"></i> ${friend}`;
            el.addEventListener("click", () => openDm(friend));
            dmListDms.appendChild(el);
          });
        }
      }, (error) => console.error("Friends sync error:", error));
  }

  function acceptRequest(id, from) {
    const me = getUsername();
    if (!me) return;
    
    const batch = db.batch();
    batch.update(db.collection("friendRequests").doc(id), { status: "accepted" });
    
    const friendshipId = [me, from.toLowerCase()].sort().join("_");
    batch.set(db.collection("friends").doc(friendshipId), { 
      users: [me, from.toLowerCase()], 
      timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    });
    
    batch.commit().then(() => {
      showToast(`Accepted friend request from ${from}!`);
      initSocial(); // Force refresh
    });
  }

  function rejectRequest(id) {
    db.collection("friendRequests").doc(id).update({ status: "rejected" });
  }

  // ============================================================
  // UI HANDLERS
  // ============================================================

  if (notifBtn) notifBtn.addEventListener("click", () => notifModal.classList.add("open"));
  if (closeNotifModal) closeNotifModal.addEventListener("click", () => notifModal.classList.remove("open"));

  function openFriendModalIfLoggedIn() {
    const me = getUsername();
    if (!me) {
      showToast("You must be logged in to add friends");
      const loginBtn = document.getElementById("loginBtn");
      if (loginBtn) loginBtn.click();
      return;
    }
    friendModal.classList.add("open");
  }

  if (document.getElementById("topFriendsBtn")) {
    document.getElementById("topFriendsBtn").addEventListener("click", () => {
      showPage('dms');
      openFriendModalIfLoggedIn();
    });
  }

  if (document.getElementById("addFriendBtnDms")) {
    document.getElementById("addFriendBtnDms").addEventListener("click", openFriendModalIfLoggedIn);
  }
  if (document.getElementById("addFriendBtnShortcut")) {
    document.getElementById("addFriendBtnShortcut").addEventListener("click", openFriendModalIfLoggedIn);
  }
  if (closeFriendModal) closeFriendModal.addEventListener("click", () => friendModal.classList.remove("open"));

  if (sendFriendRequestBtn) {
    sendFriendRequestBtn.addEventListener("click", () => {
      const me = getUsername();
      if (!me) {
        showToast("You must be logged in to send friend requests");
        friendModal.classList.remove("open");
        const loginBtn = document.getElementById("loginBtn");
        if (loginBtn) loginBtn.click();
        return;
      }
      const target = friendUsernameInput.value.trim().toLowerCase();
      if (!target) { showToast("Enter a username"); return; }
      if (target === me) { showToast("You can't add yourself"); return; }

      db.collection("friendRequests").add({
        from: me,
        to: target,
        status: "pending",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        showToast(`Friend request sent to ${target}!`);
        friendModal.classList.remove("open");
        friendUsernameInput.value = "";
      }).catch((err) => {
        console.error("Friend request error:", err);
        showToast("Failed to send friend request");
      });
    });
  }

  // Seed friendship for testing
  function seedFriendship() {
    const me = getUsername();
    if (me === "theowner" || me === "alt") {
      const friendshipId = ["theowner", "alt"].sort().join("_");
      db.collection("friends").doc(friendshipId).set({
        users: ["theowner", "alt"],
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  function formatTime(timestamp) {
    if (!timestamp) return "Just now";
    const date = (timestamp instanceof firebase.firestore.Timestamp) ? timestamp.toDate() : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // Auth Sync
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Robust UI update
      if (chatForm) chatForm.style.display = "flex";
      if (chatLoginPrompt) chatLoginPrompt.style.display = "none";
      if (dmLoginPrompt) dmLoginPrompt.style.display = "none";
      
      initGlobalChat();
      initSocial();
      initRoomsList();
      seedFriendship();
      startCleanupTimer();
    } else {
      stopCleanupTimer();
      if (chatForm) chatForm.style.display = "none";
      if (chatLoginPrompt) chatLoginPrompt.style.display = "flex";
      if (dmLoginPrompt) dmLoginPrompt.style.display = "flex";
      if (dmForm) dmForm.style.display = "none";

      if (unsubscribeChat) unsubscribeChat();
      if (unsubscribeDms) unsubscribeDms();
      if (unsubscribeNotifs) unsubscribeNotifs();
      if (unsubscribeFriends) unsubscribeFriends();
      if (unsubscribeRooms) unsubscribeRooms();

      // Reset to global chat view when logged out and clear room list
      activeChannel = { type: "global" };
      if (roomList) roomList.innerHTML = `<p style="text-align:center; opacity:0.5; padding:12px; font-size:0.85rem;">Log in to see your groups</p>`;
      renderActiveChannelHeader();
    }
  });
});
