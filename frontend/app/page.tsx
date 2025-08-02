"use client";
import { DefaultEventsMap } from "@socket.io/component-emitter";
import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

const ROOM_ID = "main";
let socket: Socket<DefaultEventsMap, DefaultEventsMap>;

export default function TextChat() {
  const [peers, setPeers] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string>("");
  const [userUsernames, setUserUsernames] = useState<Record<string, string>>(
    {}
  );
  const [messageInput, setMessageInput] = useState<string>("");
  const [receivedMessages, setReceivedMessages] = useState<
    Array<{
      id: string;
      userId: string;
      username: string;
      text: string;
      timestamp: number;
    }>
  >([]);
  const [floatingTexts, setFloatingTexts] = useState<
    Array<{
      id: string;
      text: string;
      x: number;
      y: number;
      timestamp: number;
      userId: string;
      username: string;
    }>
  >([]);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<
      string,
      {
        x: number;
        y: number;
        username: string;
        lastUpdate: number;
        color: string;
      }
    >
  >({});
  const [liveTyping, setLiveTyping] = useState<
    Record<
      string,
      {
        text: string;
        username: string;
        lastUpdate: number;
        x: number;
        y: number;
        fontSize: number;
        fontFamily: string;
        color: string;
      }
    >
  >({});

  // Random fonts and colors
  const randomFonts = [
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Georgia",
    "Verdana",
    "Courier New",
    "Impact",
    "Comic Sans MS",
    "Tahoma",
    "Trebuchet MS",
    "Lucida Console",
    "Palatino",
    "Garamond",
    "Bookman",
    "Avant Garde",
    "Arial Black",
    "Century Gothic",
    "Futura",
    "Bodoni",
    "Rockwell",
  ];

  const randomColors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
    "#F8C471",
    "#82E0AA",
    "#F1948A",
    "#85C1E9",
    "#D7BDE2",
    "#FAD7A0",
    "#ABEBC6",
    "#F9E79F",
    "#D5A6BD",
    "#A9CCE3",
  ];

  // Generate a random color
  const getRandomColor = () => {
    return randomColors[Math.floor(Math.random() * randomColors.length)];
  };

  // Generate random styling for text
  const generateRandomStyle = () => {
    return {
      x: Math.random() * (window.innerWidth - 200),
      y: Math.random() * (window.innerHeight - 100),
      fontSize: Math.floor(Math.random() * 40) + 12, // 12px to 52px
      fontFamily: randomFonts[Math.floor(Math.random() * randomFonts.length)],
      color: randomColors[Math.floor(Math.random() * randomColors.length)],
    };
  };

  // Random username generator
  const randomNames = [
    "MicGoblin",
    "FlexDaddy",
    "CEOofBreathing",
    "VoiceWizard",
    "EchoMaster",
    "ScreamLord",
    "WhisperQueen",
    "AudioChaos",
    "SoundGoblin",
    "NoiseMaker",
    "VocalVandal",
    "DecibelDemon",
    "SonicSage",
    "AcousticAnarchist",
    "PitchPirate",
    "ChatMaster",
    "TextWizard",
    "MessageGoblin",
    "TypingNinja",
    "KeyboardKing",
    "WordSmith",
    "TextAlchemist",
    "MessageMage",
    "ChatSorcerer",
    "TextWarlock",
    "DigitalDruid",
    "CyberShaman",
    "NetNecromancer",
    "PixelPirate",
    "ByteBard",
  ];

  // Generate a random username
  const generateRandomUsername = () => {
    return randomNames[Math.floor(Math.random() * randomNames.length)];
  };

  // Handle mouse movement
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isConnected && socket) {
      socket.emit("cursor-move", {
        x: e.clientX,
        y: e.clientY,
        userId: myUserId,
        username: myUsername,
        timestamp: Date.now(),
      });
    }
  };

  // Handle text input changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setMessageInput(newText);

    // Send live typing update
    if (isConnected && socket) {
      socket.emit("live-typing", {
        text: newText,
        userId: myUserId,
        username: myUsername,
        timestamp: Date.now(),
      });
    }
  };

  // Update usernames every 30 seconds
  useEffect(() => {
    if (isConnected) {
      const updateUsernames = () => {
        // Update my username
        const newUsername = generateRandomUsername();
        setMyUsername(newUsername);

        // Update other users' usernames
        const newUserUsernames: Record<string, string> = {};
        connectedUsers.forEach((userId) => {
          newUserUsernames[userId] = generateRandomUsername();
        });
        setUserUsernames(newUserUsernames);

        // Broadcast username change
        socket.emit("username-change", {
          userId: myUserId,
          username: newUsername,
        });
      };

      // Initial username generation
      updateUsernames();

      // Set up interval for username changes
      const interval = setInterval(updateUsernames, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, connectedUsers, myUserId]);

  // Clean up stale cursors and typing
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Clean up stale cursors
      setRemoteCursors((prev) => {
        const newCursors = { ...prev };
        Object.keys(newCursors).forEach((userId) => {
          if (now - newCursors[userId].lastUpdate > 5000) {
            // Remove after 5 seconds of inactivity
            delete newCursors[userId];
          }
        });
        return newCursors;
      });

      // Clean up stale typing
      setLiveTyping((prev) => {
        const newTyping = { ...prev };
        Object.keys(newTyping).forEach((userId) => {
          if (now - newTyping[userId].lastUpdate > 3000) {
            // Remove after 3 seconds of inactivity
            delete newTyping[userId];
          }
        });
        return newTyping;
      });
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Add floating text animation
  const addFloatingText = (text: string, userId: string, username: string) => {
    const newText = {
      id: Date.now().toString(),
      text,
      x: Math.random() * (window.innerWidth - 300),
      y: Math.random() * (window.innerHeight - 100),
      timestamp: Date.now(),
      userId,
      username,
    };

    setFloatingTexts((prev) => [...prev, newText]);

    // Remove text after 5 seconds
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== newText.id));
    }, 5000);
  };

  // Send a message (now just clears the input since typing is live)
  const sendMessage = () => {
    if (messageInput.trim()) {
      // Clear the input
      setMessageInput("");

      // Clear live typing for this user
      setLiveTyping((prev) => {
        const newTyping = { ...prev };
        delete newTyping[myUserId!];
        return newTyping;
      });

      // Send empty typing update to clear remote display
      if (isConnected && socket) {
        socket.emit("live-typing", {
          text: "",
          userId: myUserId,
          username: myUsername,
          timestamp: Date.now(),
        });
      }
    }
  };

  // Send a test message (for debugging)
  const sendTestMessage = () => {
    const testText = "Hello from " + myUsername;
    addFloatingText(testText, myUserId || "You", myUsername);
  };

  useEffect(() => {
    const start = async () => {
      // Connect to your local Express Socket.IO server
      socket = io("https://socketchat-dun.vercel.app/");

      socket.on("connect", () => {
        setIsConnected(true);
        console.log("Connected to Express server");
        // Store our own user ID
        setMyUserId(socket.id || null);
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
        console.log("Disconnected from Express server");
      });

      // Handle initial user list when joining
      socket.on("user-list", (users: string[]) => {
        console.log("Received user list:", users);
        // Filter out our own ID from the list
        const otherUsers = users.filter((id) => id !== socket.id);
        setConnectedUsers(otherUsers);

        // Generate initial usernames for other users
        const initialUsernames: Record<string, string> = {};
        otherUsers.forEach((userId) => {
          initialUsernames[userId] = generateRandomUsername();
        });
        setUserUsernames(initialUsernames);
      });

      socket.emit("join", ROOM_ID);

      socket.on("user-joined", async (id) => {
        console.log("User joined:", id);
        // Don't add our own ID to the list
        if (id !== socket.id) {
          setConnectedUsers((prev) => [...prev, id]);
          // Generate username for new user
          setUserUsernames((prev) => ({
            ...prev,
            [id]: generateRandomUsername(),
          }));
        }
      });

      socket.on("user-disconnected", (id) => {
        console.log("User disconnected:", id);
        setConnectedUsers((prev) => prev.filter((userId) => userId !== id));
        // Remove username for disconnected user
        setUserUsernames((prev) => {
          const newUsernames = { ...prev };
          delete newUsernames[id];
          return newUsernames;
        });
        // Remove cursor for disconnected user
        setRemoteCursors((prev) => {
          const newCursors = { ...prev };
          delete newCursors[id];
          return newCursors;
        });
        // Remove typing for disconnected user
        setLiveTyping((prev) => {
          const newTyping = { ...prev };
          delete newTyping[id];
          return newTyping;
        });
      });

      // Handle received messages
      socket.on("transcribed-text", ({ text, userId, username, timestamp }) => {
        console.log("Received message:", text, "from", username);
        setReceivedMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), userId, username, text, timestamp },
        ]);
        addFloatingText(text, userId, username);
      });

      // Handle username changes
      socket.on("username-change", ({ userId, username }) => {
        if (userId !== myUserId) {
          setUserUsernames((prev) => ({
            ...prev,
            [userId]: username,
          }));
          // Update cursor username if it exists
          setRemoteCursors((prev) => {
            if (prev[userId]) {
              return {
                ...prev,
                [userId]: { ...prev[userId], username },
              };
            }
            return prev;
          });
          // Update typing username if it exists
          setLiveTyping((prev) => {
            if (prev[userId]) {
              return {
                ...prev,
                [userId]: { ...prev[userId], username },
              };
            }
            return prev;
          });
        }
      });

      // Handle cursor movements
      socket.on("cursor-move", ({ x, y, userId, username }) => {
        if (userId !== myUserId) {
          setRemoteCursors((prev) => ({
            ...prev,
            [userId]: {
              x,
              y,
              username,
              lastUpdate: Date.now(),
              color: prev[userId]?.color || getRandomColor(),
            },
          }));
        }
      });

      // Handle live typing
      socket.on("live-typing", ({ text, userId, username }) => {
        if (userId !== myUserId) {
          if (text.trim()) {
            const style = generateRandomStyle();
            setLiveTyping((prev) => ({
              ...prev,
              [userId]: {
                text,
                username,
                lastUpdate: Date.now(),
                ...style,
              },
            }));
          } else {
            // Clear typing if text is empty
            setLiveTyping((prev) => {
              const newTyping = { ...prev };
              delete newTyping[userId];
              return newTyping;
            });
          }
        }
      });
    };

    start();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 text-white p-8 relative"
      onMouseMove={handleMouseMove}
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
          socket chat - Live Text Chat
        </h1>

        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-pink-500/30 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full ${
                  isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                }`}
              />
              <span className="font-medium">
                {isConnected ? "Connected to Express Server" : "Connecting..."}
              </span>
            </div>
            <div className="text-sm text-pink-200">Room: {ROOM_ID}</div>
          </div>

          <div className="space-y-2">
            <p className="text-pink-200">
              Connected Users: {connectedUsers.length + 1} (including you)
            </p>
            {myUserId && (
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                  You: {myUsername}
                </span>
                {connectedUsers.map((userId) => (
                  <span
                    key={userId}
                    className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm"
                  >
                    {userUsernames[userId] || "Unknown"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-pink-500/30 mb-6">
          <h3 className="text-xl font-bold mb-4 text-yellow-400">
            Live Typing
          </h3>
          <div className="flex gap-2">
            <textarea
              value={messageInput}
              onChange={handleTextChange}
              onKeyPress={handleKeyPress}
              placeholder="Type here and others will see it in random fonts and sizes..."
              className="flex-1 bg-black/50 border border-pink-500/30 rounded-lg p-3 text-white placeholder-pink-300 resize-none"
              rows={3}
            />
            <button
              onClick={sendMessage}
              disabled={!messageInput.trim()}
              className="px-6 py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-all"
            >
              Clear
            </button>
          </div>
          <p className="text-sm text-pink-200 mt-2">
            Press Enter to clear, Shift+Enter for new line. Your typing appears
            in random fonts and sizes across the screen!
          </p>
        </div>

        {/* Messages Display */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-pink-500/30 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-yellow-400">Chat Messages</h3>
            <button
              onClick={sendTestMessage}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-full text-sm transition-all"
            >
              Send Test Message
            </button>
          </div>

          {/* Received Messages */}
          <div className="bg-black/50 rounded-lg p-4 max-h-80 overflow-y-auto">
            {receivedMessages.length === 0 ? (
              <p className="text-pink-200 text-sm">No messages yet...</p>
            ) : (
              <div className="space-y-2">
                {receivedMessages.map((message) => (
                  <div key={message.id} className="flex items-start gap-2">
                    <span className="text-xs text-blue-400 font-mono">
                      {message.username}:
                    </span>
                    <span className="text-pink-200 text-sm">
                      {message.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-pink-200">
          <p className="mb-4">
            💬 Type to see your text appear in random fonts and sizes across the
            screen
          </p>
          <p className="text-sm opacity-75">
            Open this page in multiple browser tabs to test the chaotic typing!
          </p>
        </div>
      </div>

      {/* Live Typing Overlay - Random Fonts and Sizes */}
      {Object.entries(liveTyping).map(([userId, typing]) => (
        <div
          key={userId}
          className="fixed pointer-events-none z-30"
          style={{
            left: typing.x,
            top: typing.y,
            fontSize: `${typing.fontSize}px`,
            fontFamily: typing.fontFamily,
            color: typing.color,
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            transform: "translate(-50%, -50%)",
            animation: "typingGlow 2s ease-in-out infinite alternate",
          }}
        >
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
            <div className="text-xs text-white/80 mb-1 font-mono">
              {typing.username}
            </div>
            <div className="whitespace-pre-wrap">
              {typing.text}
              <span className="animate-pulse">|</span>
            </div>
          </div>
        </div>
      ))}

      {/* Remote Cursors */}
      {Object.entries(remoteCursors).map(([userId, cursor]) => (
        <div
          key={userId}
          className="fixed pointer-events-none z-40"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="flex flex-col items-center">
            <div
              className="w-4 h-4 rounded-full animate-pulse"
              style={{ backgroundColor: cursor.color }}
            />
            <div
              className="bg-black/80 backdrop-blur-sm rounded px-2 py-1 mt-1 border"
              style={{ borderColor: `${cursor.color}50` }}
            >
              <span
                className="text-xs font-mono"
                style={{ color: cursor.color }}
              >
                {cursor.username}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Floating Text Overlay */}
      {floatingTexts.map((text) => (
        <div
          key={text.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: text.x,
            top: text.y,
            animation: "float 5s ease-out forwards",
          }}
        >
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-pink-500/50 shadow-lg">
            <div className="text-xs text-blue-400 font-mono mb-1">
              {text.username}
            </div>
            <p className="text-white font-medium text-lg">
              &ldquo;{text.text}&rdquo;
            </p>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes float {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateY(-20px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-40px) scale(0.8);
          }
        }

        @keyframes typingGlow {
          0% {
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
          }
          100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
          }
        }
      `}</style>
    </div>
  );
}
