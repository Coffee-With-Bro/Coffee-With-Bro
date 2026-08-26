# Sign-to-Text — How It Works (Team Reference)

This doc explains, in plain language, what each file in the project does
and why it exists. No prior Spring Boot or MediaPipe experience assumed.

## Part 1 — Python: `extract_landmarks.py`

### What problem is this solving?

We have 36,000 photos of hands making ASL signs, sorted into folders by
letter/digit (`0`-`9`, `a`-`z`). A computer can't learn from raw photos
directly in a useful way for this — photos are huge (thousands of pixel
values) and full of irrelevant stuff (background, skin tone, lighting).

So instead, we use a tool called **MediaPipe** (made by Google) that looks
at a photo of a hand and outputs just **21 key points** on that hand —
knuckles, fingertips, wrist, etc. — as simple (x, y, z) coordinates.
That's a much smaller, cleaner signal: instead of a whole photo, we get
21 dots describing the hand's shape.

This script's job: go through all 36,000 photos, run MediaPipe on each
one, and save the resulting dots into two simple spreadsheet files
(`train.csv` and `test.csv`) — one row per photo.

### Step by step, in order

1. **Load the hand-detection model once.** This is the expensive part
   (loading a trained AI model into memory), so we do it a single time
   at the start, not once per photo.

2. **Go folder by folder.** For each label folder (like `a/`, `b/`,
   `0/`...), grab every image inside it.

3. **For each image:**
   - Open it (skip it if the file is broken/unreadable)
   - Convert its color format (a technical quirk — the image-loading
     library and the AI model expect colors in a different order, so we
     flip it)
   - Run the AI model on it → get back a list of detected hands, each
     with 21 (x, y, z) points
   - If no hand was found in the photo, skip it and count it (so we
     know later how many photos were unusable)
   - If a hand *was* found, flatten those 21 points into one row of
     numbers

4. **Handle the "how many hands" problem.** Most signs use one hand, but
   some (like "0") use two. To keep every row the same size/shape (which
   spreadsheets/ML tools require), every row always has slots for **2**
   hands. If only one hand was found, the second hand's slot gets filled
   with zeros instead of left blank.

5. **Save everything.** All the rows get written into `train.csv` and
   `test.csv` — one file per dataset split, matching the folder structure
   we already had.

6. **Print a summary.** How many images were processed successfully, and
   how many were skipped and why — useful for sanity-checking data
   quality afterward.

### End result

Two CSV files. Each row = one photo, translated from "picture of a hand"
into "126 numbers describing where the hand's joints are." That's the
actual input a machine learning model will train on later — not the raw
photos.

---

## Part 2 — Java (Spring Boot) Backend

### What is Spring Boot, in one sentence?

It's a framework that handles all the boring, repetitive "plumbing" of
running a Java server (starting a web server, managing objects, routing
network requests) so we only have to write the actual logic specific to
our app.

### The big idea: Spring manages objects for you

In normal Java, if class A needs class B, you write `new B()` yourself.
In Spring, you instead **label** a class as "available for Spring to
manage" using an **annotation** (a `@Something` tag above the class).
Spring then creates exactly one instance of that class automatically when
the app starts, and hands it to anything else that needs it — no manual
wiring required. These managed objects are called **beans**.

This matters because it's *why* our files look the way they do — you'll
see `@Component` and `@Configuration` tags everywhere, and constructors
that seem to "magically" receive objects they never created themselves.

---

### File: `CoffeeWithBroApplication.java` — the entry point

```java
@SpringBootApplication
public class CoffeeWithBroApplication {
    public static void main(String[] args) {
        SpringApplication.run(CoffeeWithBroApplication.class, args);
    }
}
```

- This is the file that actually starts everything. Running this class
  is what boots up the whole server.
- `@SpringBootApplication` is a shortcut annotation that turns on
  several things at once, most importantly: **component scanning** —
  Spring automatically searches through all our files, finds every class
  marked `@Component` or `@Configuration`, and creates/wires them all up
  automatically. We never manually list "here are all my classes" — 
  Spring finds them.

---

### File: `EchoWebSocketHandler.java` — handles incoming connections/messages

**Background concept: what's a WebSocket?**

Normal web requests (like loading a webpage) are one-shot: ask for
something, get an answer, connection closes. That's too slow/wasteful
for our use case, where the browser needs to send hand-position data
continuously, many times per second. A **WebSocket** is a connection
that *stays open* — both sides can send messages back and forth anytime,
without reconnecting each time.

```java
@Component
public class EchoWebSocketHandler extends TextWebSocketHandler {

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        System.out.println("Client connected: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        System.out.println("Received: " + message.getPayload());
        session.sendMessage(new TextMessage("Echo: " + message.getPayload()));
    }
}
```

**What's actually happening here:**

- `@Component` — tells Spring "manage this class as a bean" (see above).
- `extends TextWebSocketHandler` — Spring already wrote a class that
  handles all the low-level, complicated networking details of
  WebSockets (the handshake, keeping the connection alive, etc). We
  don't touch any of that — we just **inherit** it, then override two
  specific moments we care about.
- `afterConnectionEstablished(...)` — runs automatically, exactly once,
  the moment a browser successfully connects. Right now it just prints
  a log message so we can see in the terminal that a connection came in.
- `handleTextMessage(...)` — runs automatically **every single time** a
  message arrives from the browser while connected. Right now it:
  1. Prints what was received (for debugging)
  2. Sends a reply back down the same connection — literally the same
     text, with "Echo: " stuck on the front, to prove the round trip
     works

This file currently does nothing "smart" — it's a deliberately simple
placeholder to prove the connection itself works, before we add real
hand-landmark logic on top of it.

---

### File: `WebSocketConfig.java` — tells Spring *where* the handler lives

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final EchoWebSocketHandler echoWebSocketHandler;

    public WebSocketConfig(EchoWebSocketHandler echoWebSocketHandler) {
        this.echoWebSocketHandler = echoWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(echoWebSocketHandler, "/ws/echo")
                .setAllowedOrigins("*");
    }
}
```

**Why does this file need to exist separately from the handler above?**

`EchoWebSocketHandler` contains the *logic* for what happens on a
connection, but nothing yet says "make this reachable at a specific web
address." This file is that missing link.

**What's happening here:**

- `@Configuration` — same idea as `@Component` (Spring manages this
  class), but by convention used for classes whose job is *wiring things
  together* rather than doing the actual work.
- `@EnableWebSocket` — switches on Spring's WebSocket support at all;
  without this, none of our WebSocket setup would activate.
- **The constructor** — this is the "magic" part. We never write
  `new EchoWebSocketHandler()` anywhere in the whole project. Instead:
  Spring already created one instance of it (because of `@Component`
  above). When Spring creates `WebSocketConfig`, it looks at what the
  constructor needs, sees it wants an `EchoWebSocketHandler`, and
  automatically passes in the exact instance it already made. This
  automatic hand-off is called **dependency injection** — it's the core
  mechanic behind almost everything Spring does.
- `registerWebSocketHandlers(...)` — the one method we're required to
  fill in. `registry.addHandler(echoWebSocketHandler, "/ws/echo")` is
  the actual line that says: "any connection to `/ws/echo` should be
  handled by this specific handler object." `.setAllowedOrigins("*")`
  allows connections from any webpage — fine for local development.

---

## Putting it together: what happens when the browser connects?

1. Browser runs `new WebSocket("ws://localhost:8080/ws/echo")`
2. Spring sees the request is for path `/ws/echo`, checks its
   registry (set up in `WebSocketConfig`), and routes it to
   `EchoWebSocketHandler`
3. `afterConnectionEstablished(...)` fires once → logs the connection
4. Every message the browser sends afterward triggers
   `handleTextMessage(...)` → logs it, sends a reply back
5. This proves the full round trip works — browser → Java → browser —
   before any real hand-landmark data flows through the same pipe

This whole flow is currently just an echo test. The next real step is
replacing the placeholder logic in the handler with actual landmark
processing, and adding a way to permanently store recorded signs.
