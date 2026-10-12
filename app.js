
/* =====================================================
   BEHESHTA TOEFL STUDIO
   app.js — Interactive study system + Baby assistant
   Works with the current index.html and style.css
===================================================== */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const STORAGE_KEY = "beheshtaToeflStudio_v2";
  const DAY = new Date().toISOString().slice(0, 10);

  const safeRead = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  };

  const state = Object.assign(
    {
      completed: 0,
      learnedWords: [],
      totalStudySeconds: 0,
      activities: [],
      dailyGoal: 60,
      streak: 0,
      lastVisit: "",
      plan: null,
      difficultWords: [],
      dailyCompleted: {},
    },
    safeRead()
  );

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Progress could not be saved:", error);
    }
    updateProgress();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function shuffleIndex(length, offset = 0) {
    return length ? (Math.floor(Date.now() / 86400000) + offset) % length : 0;
  }

  /* ---------------- DAILY CONTENT ---------------- */

  const exercises = {
    reading: [
      {
        title: "Urban Green Spaces",
        passage:
          "Urban parks provide more than places for recreation. " +
          "Research suggests that green spaces can reduce heat in cities, " +
          "support biodiversity, and encourage social interaction. " +
          "However, their benefits depend partly on accessibility. " +
          "When parks are located far from residential areas, some communities " +
          "receive fewer environmental and social benefits. City planners " +
          "therefore increasingly consider both the size and distribution of parks.",
        question: "According to the passage, why is the location of parks important?",
        options: [
          "It determines whether communities can benefit from them.",
          "It prevents all forms of urban pollution.",
          "It makes biodiversity unnecessary.",
          "It guarantees that every park is large.",
        ],
        answer: 0,
        explanation:
          "The passage says that communities may receive fewer benefits when parks are difficult to access.",
        hint: "Look for the sentence about parks far from residential areas.",
      },
      {
        title: "The Science of Sleep",
        passage:
          "Sleep plays an important role in learning and memory. During sleep, " +
          "the brain processes information gathered throughout the day. " +
          "Although studying for longer hours may seem productive, reducing " +
          "sleep can weaken attention and recall. For this reason, many " +
          "educators recommend a balanced routine that combines focused study " +
          "with sufficient rest.",
        question: "What is the main idea of the passage?",
        options: [
          "Sleep supports learning and memory.",
          "Students should never study at night.",
          "Memory depends only on repetition.",
          "Longer study hours always produce better results.",
        ],
        answer: 0,
        explanation:
          "The central idea is that sleep helps the brain process information and supports learning.",
        hint: "Think about the main benefit of sleep discussed here.",
      },
      {
        title: "Renewable Energy",
        passage:
          "Solar and wind power have expanded as technology has improved. " +
          "These sources produce electricity without directly burning fossil fuels. " +
          "Nevertheless, their output can vary with weather and time of day. " +
          "Energy storage and improved electricity networks can help balance " +
          "supply and demand, making renewable energy more reliable.",
        question: "What challenge associated with renewable energy is mentioned?",
        options: [
          "Its output can change with weather and time.",
          "It always requires burning coal.",
          "It cannot produce electricity.",
          "It makes electricity networks unnecessary.",
        ],
        answer: 0,
        explanation:
          "The passage identifies changing weather and time of day as reasons for variable output.",
        hint: "Find the sentence beginning with 'Nevertheless'.",
      },
    ],

    listening: [
      {
        title: "A University Announcement",
        transcript:
          "Hello students. The university library will close at six o'clock " +
          "this Friday because of scheduled maintenance. Students who need " +
          "to borrow books should visit before five thirty. The library will " +
          "reopen at its regular time on Saturday morning.",
        question: "Why will the library close early on Friday?",
        options: [
          "Because of scheduled maintenance.",
          "Because classes have been cancelled.",
          "Because new students are arriving.",
          "Because it is a public holiday.",
        ],
        answer: 0,
        explanation:
          "The announcement explicitly says the early closing is due to scheduled maintenance.",
        hint: "Listen for the reason given after the closing time.",
      },
      {
        title: "A Biology Lecture",
        transcript:
          "Plants need light to carry out photosynthesis. During this process, " +
          "they use light energy to convert water and carbon dioxide into " +
          "sugars. Oxygen is released as a by-product. The sugars provide " +
          "energy that helps plants grow and maintain their activities.",
        question: "What is one result of photosynthesis?",
        options: [
          "Plants release oxygen.",
          "Plants stop growing.",
          "Plants turn oxygen into sunlight.",
          "Plants no longer need water.",
        ],
        answer: 0,
        explanation:
          "The lecture states that oxygen is released as a by-product.",
        hint: "Listen to the sentence describing the by-product.",
      },
      {
        title: "Office Hours",
        transcript:
          "Professor Miller will hold office hours on Wednesday afternoon " +
          "instead of Thursday this week. Students can discuss their research " +
          "projects or ask questions about the upcoming examination. " +
          "Please send an email to reserve a fifteen-minute appointment.",
        question: "What should students do to reserve an appointment?",
        options: [
          "Send an email.",
          "Take another examination.",
          "Visit the office on Thursday.",
          "Submit a research paper immediately.",
        ],
        answer: 0,
        explanation:
          "Students are instructed to send an email to reserve a time.",
        hint: "Listen to the final sentence.",
      },
    ],

    speaking: [
      {
        prompt:
          "Describe a skill you would like to learn and explain why it is important to you.",
        instructions:
          "Prepare for 30 seconds, then speak for 60 seconds. Give reasons and an example.",
      },
      {
        prompt:
          "Do you prefer studying alone or studying with a group? Explain your choice.",
        instructions:
          "State your preference clearly, give two reasons, and include a personal example.",
      },
      {
        prompt:
          "Describe a place where you can concentrate well. Explain what makes it suitable.",
        instructions:
          "Organize your response with an introduction, supporting details, and a conclusion.",
      },
    ],

    writing: [
      {
        prompt:
          "Some students prefer online learning, while others prefer traditional classrooms. Which do you prefer and why?",
        instructions:
          "Write a clear response with a position, supporting reasons, and a relevant example.",
      },
      {
        prompt:
          "Do you agree or disagree that university students should participate in volunteer activities?",
        instructions:
          "Support your opinion with specific reasons and examples.",
      },
      {
        prompt:
          "What is more important for success: natural talent or consistent effort?",
        instructions:
          "Present your opinion and explain it using clear examples.",
      },
    ],
  };

  const vocabulary = [
    {
      word: "Significant",
      pronunciation: "sig-NIF-i-kənt",
      meaning: "مهم، قابل توجه",
      example: "Education has a significant impact on society.",
    },
    {
      word: "Maintain",
      pronunciation: "main-TAYN",
      meaning: "حفظ کردن، نگه‌داشتن",
      example: "It is important to maintain a healthy routine.",
    },
    {
      word: "Evidence",
      pronunciation: "EV-i-dəns",
      meaning: "شواهد، مدرک",
      example: "The researcher presented evidence for the theory.",
    },
    {
      word: "Contribute",
      pronunciation: "kən-TRIB-yoot",
      meaning: "سهم داشتن، کمک کردن",
      example: "Reading can contribute to language development.",
    },
    {
      word: "Approach",
      pronunciation: "ə-PROHCH",
      meaning: "روش، رویکرد",
      example: "We need a different approach to this problem.",
    },
    {
      word: "Reliable",
      pronunciation: "ri-LY-ə-bəl",
      meaning: "قابل اعتماد",
      example: "Reliable information is essential for research.",
    },
    {
      word: "Benefit",
      pronunciation: "BEN-i-fit",
      meaning: "فایده، سود",
      example: "Daily practice can benefit language learners.",
    },
    {
      word: "Require",
      pronunciation: "ri-KWYR",
      meaning: "نیاز داشتن، لازم داشتن",
      example: "Academic writing requires careful planning.",
    },
    {
      word: "Establish",
      pronunciation: "i-STAB-lish",
      meaning: "ایجاد کردن، پایه‌گذاری کردن",
      example: "The university established a new research centre.",
    },
    {
      word: "Interpret",
      pronunciation: "in-TUR-prit",
      meaning: "تفسیر کردن، معنا کردن",
      example: "Readers must interpret the author's main argument.",
    },
    {
      word: "Consequently",
      pronunciation: "KON-si-kwent-lee",
      meaning: "در نتیجه، بنابراین",
      example: "The road was closed; consequently, we arrived late.",
    },
    {
      word: "Efficient",
      pronunciation: "i-FISH-ənt",
      meaning: "کارآمد، مؤثر",
      example: "A clear schedule makes study more efficient.",
    },
    {
      word: "Assume",
      pronunciation: "ə-SOOM",
      meaning: "فرض کردن",
      example: "We should not assume that every result is correct.",
    },
    {
      word: "Appropriate",
      pronunciation: "ə-PROH-pree-ət",
      meaning: "مناسب",
      example: "Choose an appropriate example for your argument.",
    },
    {
      word: "Factor",
      pronunciation: "FAK-tər",
      meaning: "عامل",
      example: "Time is an important factor in exam preparation.",
    },
    {
      word: "Indicate",
      pronunciation: "IN-di-kayt",
      meaning: "نشان دادن",
      example: "The results indicate a clear improvement.",
    },
    {
      word: "Contrast",
      pronunciation: "KON-trast",
      meaning: "تفاوت، مقایسهٔ مخالف",
      example: "The essay contrasts two different approaches.",
    },
    {
      word: "Consider",
      pronunciation: "kən-SID-ər",
      meaning: "در نظر گرفتن، بررسی کردن",
      example: "Consider the evidence before making a decision.",
    },
    {
      word: "Achieve",
      pronunciation: "ə-CHEEV",
      meaning: "به دست آوردن، موفق شدن",
      example: "Consistent practice helps students achieve their goals.",
    },
    {
      word: "Analyze",
      pronunciation: "AN-ə-lyze",
      meaning: "تحلیل کردن",
      example: "Students analyze the passage before answering.",
    },
    {
      word: "Interpretation",
      pronunciation: "in-tur-pri-TAY-shən",
      meaning: "تفسیر، برداشت",
      example: "Her interpretation of the text was convincing.",
    },
    {
      word: "Sufficient",
      pronunciation: "sə-FISH-ənt",
      meaning: "کافی",
      example: "Make sure you have sufficient time to review.",
    },
    {
      word: "Emphasize",
      pronunciation: "EM-fə-size",
      meaning: "تأکید کردن",
      example: "The speaker emphasized the importance of practice.",
    },
    {
      word: "Tend",
      pronunciation: "TEND",
      meaning: "تمایل داشتن، معمول بودن",
      example: "Students tend to improve with regular feedback.",
    },
    {
      word: "Alternative",
      pronunciation: "awl-TUR-nə-tiv",
      meaning: "جایگزین، گزینهٔ دیگر",
      example: "Online courses offer an alternative to classroom learning.",
    },
    {
      word: "Complex",
      pronunciation: "kom-PLEKS",
      meaning: "پیچیده",
      example: "The article explains a complex scientific idea.",
    },
    {
      word: "Evaluate",
      pronunciation: "i-VAL-yoo-ayt",
      meaning: "ارزیابی کردن",
      example: "Evaluate each option before choosing an answer.",
    },
    {
      word: "Relevant",
      pronunciation: "REL-ə-vənt",
      meaning: "مرتبط، مربوط",
      example: "Include only relevant details in your response.",
    },
    {
      word: "Demonstrate",
      pronunciation: "DEM-ən-strayt",
      meaning: "نشان دادن، ثابت کردن",
      example: "The experiment demonstrates how the process works.",
    },
    {
      word: "Perspective",
      pronunciation: "pər-SPEK-tiv",
      meaning: "دیدگاه، چشم‌انداز",
      example: "The author presents a different perspective.",
    },
    {
      word: "Consistent",
      pronunciation: "kən-SIS-tənt",
      meaning: "پیوسته، منظم",
      example: "Consistent practice is more useful than occasional study.",
    },
    {
      word: "Significance",
      pronunciation: "sig-NIF-i-kəns",
      meaning: "اهمیت",
      example: "The study explains the significance of sleep.",
    },
    {
      word: "Outcome",
      pronunciation: "OUT-kəm",
      meaning: "نتیجه",
      example: "The outcome depends on several factors.",
    },
    {
      word: "Furthermore",
      pronunciation: "fur-thər-MOR",
      meaning: "علاوه بر این",
      example: "Furthermore, the method saves time.",
    },
    {
      word: "Independently",
      pronunciation: "in-di-PEN-dənt-lee",
      meaning: "به‌طور مستقل",
      example: "Students should learn to think independently.",
    },
  ];

  /* Use today's date to rotate content without repeating
     the same daily selection on every visit. */

  const dayNumber = Math.floor(Date.now() / 86400000);
  let currentSkill = "reading";
  let currentExercise = null;
  let currentWordSet = [];
  let selectedAnswer = null;
  let recording = null;
  let recordingChunks = [];
  let timerInterval = null;
  let timerRemaining = 3600;
  let timerEndAt = null;
  let timerPaused = true;
  let nudgeInterval = null;
  let lastNudge = 0;
  let sessionStartAt = null;

  function todayExercise(skill) {
    const list = exercises[skill];
    return list[dayNumber % list.length];
  }

  function todayWords() {
    const start = (dayNumber * 5) % vocabulary.length;
    return Array.from({ length: 5 }, (_, i) =>
      vocabulary[(start + i) % vocabulary.length]
    );
  }

  /* ---------------- NAVIGATION ---------------- */

  function goToSection(id) {
    const target = $(id);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });

    $$(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === id);
    });

    closeSidebar();
  }

  function openSidebar() {
    $("sidebar")?.classList.add("open");
    $("sidebarOverlay")?.classList.add("active");
  }

  function closeSidebar() {
    $("sidebar")?.classList.remove("open");
    $("sidebarOverlay")?.classList.remove("active");
  }

  $("menuToggle")?.addEventListener("click", openSidebar);
  $("sidebarClose")?.addEventListener("click", closeSidebar);
  $("sidebarOverlay")?.addEventListener("click", closeSidebar);

  $$(".nav-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      goToSection(link.dataset.nav);
    });
  });

  $("startStudyButton")?.addEventListener("click", openStudyDialog);
  $("viewAllSkills")?.addEventListener("click", () => goToSection("skills"));

  /* ---------------- FOUR SKILLS ---------------- */

  const skillLabels = {
    reading: ["READING PRACTICE", "Reading comprehension", 10],
    listening: ["LISTENING PRACTICE", "Listening comprehension", 8],
    speaking: ["SPEAKING PRACTICE", "Independent speaking", 2],
    writing: ["WRITING PRACTICE", "Academic writing", 20],
  };

  function setSkill(skill, scroll = false) {
    if (!exercises[skill]) return;
    currentSkill = skill;
    currentExercise = todayExercise(skill);
    selectedAnswer = null;

    $$(".skill-tab").forEach((tab) => {
      const active = tab.dataset.skillTab === skill;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    $$(".skill-panel").forEach((panel) => {
      const active = panel.dataset.skillPanel === skill;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });

    const [eyebrow, title, minutes] = skillLabels[skill];
    if ($("skillEyebrow")) $("skillEyebrow").textContent = eyebrow;
    if ($("skillTitle")) $("skillTitle").textContent = title;
    if ($("questionCounter")) {
      $("questionCounter").textContent = `Daily practice · ${skill}`;
    }
    if ($("exerciseDifficulty")) {
      $("exerciseDifficulty").textContent = "Difficulty: Intermediate";
    }
    if ($("exerciseEstimatedTime")) {
      $("exerciseEstimatedTime").textContent = `Suggested time: ${minutes} min`;
    }

    if (skill === "reading") renderReading();
    if (skill === "listening") renderListening();
    if (skill === "speaking") renderSpeaking();
    if (skill === "writing") renderWriting();

    if ($("answerFeedback")) $("answerFeedback").hidden = true;
    if ($("hintFeedback")) $("hintFeedback").hidden = true;
    if ($("quizActions")) $("quizActions").hidden = !["reading", "listening"].includes(skill);

    if (scroll) goToSection("skills");
  }

  $$(".skill-tab").forEach((tab) => {
    tab.addEventListener("click", () => setSkill(tab.dataset.skillTab));
  });

  $$("[data-open-skill]").forEach((button) => {
    button.addEventListener("click", () => setSkill(button.dataset.openSkill, true));
  });

  function renderReading() {
    if (!currentExercise) return;
    $("readingPassageTitle").textContent = currentExercise.title;
    $("readingPassage").textContent = currentExercise.passage;
    $("readingQuestion").textContent = currentExercise.question;
    renderOptions("readingOptions");
  }

  function renderListening() {
    if (!currentExercise) return;
    $("listeningAudioTitle").textContent = currentExercise.title;
    $("listeningAudioDescription").textContent =
      "برای شنیدن تمرین، دکمهٔ پخش متن را بزن. صدای انگلیسی از قابلیت گفتار مرورگر استفاده می‌کند.";
    $("listeningQuestion").textContent = currentExercise.question;
    renderOptions("listeningOptions");

    const audio = $("listeningAudio");
    if (audio) {
      audio.removeAttribute("src");
      audio.load();
      audio.hidden = true;
    }

    let playButton = $("listeningSpeakText");
    if (!playButton) {
      playButton = document.createElement("button");
      playButton.id = "listeningSpeakText";
      playButton.type = "button";
      playButton.className = "primary-button";
      playButton.textContent = "▶ Play listening audio";
      $("listeningAudio")?.insertAdjacentElement("afterend", playButton);
    }

    playButton.onclick = () => {
      if (!("speechSynthesis" in window)) {
        babyMessage("مرورگر این دستگاه قابلیت پخش گفتار را ندارد. لطفاً مرورگر دیگری را امتحان کن.");
        return;
      }
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentExercise.transcript);
      utterance.lang = "en-US";
      utterance.rate = 0.88;
      const voices = speechSynthesis.getVoices();
      const englishVoice = voices.find((voice) => voice.lang === "en-US")
        || voices.find((voice) => voice.lang.startsWith("en"));
      if (englishVoice) utterance.voice = englishVoice;
      speechSynthesis.speak(utterance);
    };

    let transcriptButton = $("listeningTranscript");
    if (!transcriptButton) {
      transcriptButton = document.createElement("button");
      transcriptButton.id = "listeningTranscript";
      transcriptButton.type = "button";
      transcriptButton.className = "secondary-button";
      transcriptButton.textContent = "Show transcript";
      playButton.insertAdjacentElement("afterend", transcriptButton);
    }

    let transcriptBox = $("listeningTranscriptBox");
    if (!transcriptBox) {
      transcriptBox = document.createElement("div");
      transcriptBox.id = "listeningTranscriptBox";
      transcriptBox.className = "passage-box";
      transcriptBox.hidden = true;
      transcriptButton.insertAdjacentElement("afterend", transcriptBox);
    }

    transcriptBox.textContent = currentExercise.transcript;
    transcriptButton.onclick = () => {
      transcriptBox.hidden = !transcriptBox.hidden;
      transcriptButton.textContent = transcriptBox.hidden
        ? "Show transcript" : "Hide transcript";
    };
  }

  function renderSpeaking() {
    const item = currentExercise;
    $("speakingPrompt").textContent = item.prompt;
    $("speakingInstructions").textContent = item.instructions;
    $("recordingStatus").textContent =
      "برای ضبط، اجازهٔ میکروفون را بده. ضبط روی همین دستگاه انجام می‌شود.";
    $("speakingPlayback").hidden = true;
    $("speakingDownload").hidden = true;
  }

  function renderWriting() {
    $("writingPrompt").textContent = currentExercise.prompt;
    $("writingInstructions").textContent = currentExercise.instructions;
  }

  function renderOptions(containerId) {
    const container = $(containerId);
    if (!container) return;
    container.innerHTML = "";

    currentExercise.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-option";
      button.dataset.answer = String(index);
      button.innerHTML =
        `<span class="answer-letter">${String.fromCharCode(65 + index)}</span>` +
        `<span>${escapeHTML(option)}</span>`;

      button.addEventListener("click", () => {
        selectedAnswer = index;
        $$(".answer-option", container).forEach((item) => {
          item.classList.toggle("selected", item === button);
          item.setAttribute("aria-pressed", String(item === button));
        });
      });

      container.appendChild(button);
    });
  }

  $("checkAnswer")?.addEventListener("click", () => {
    if (!["reading", "listening"].includes(currentSkill)) return;

    if (selectedAnswer === null) {
      showFeedback("لطفاً اول یکی از گزینه‌ها را انتخاب کن.", false);
      return;
    }

    const correct = selectedAnswer === currentExercise.answer;
    showFeedback(
      `${correct ? "آفرین! پاسخ درست است. ✓" : "این پاسخ درست نیست. دوباره یاد بگیر. ✦"}\n\n` +
      currentExercise.explanation,
      correct
    );

    $$(".answer-option").forEach((button) => {
      const index = Number(button.dataset.answer);
      if (index === currentExercise.answer) button.classList.add("correct");
      if (index === selectedAnswer && !correct) button.classList.add("incorrect");
    });

    const key = `${DAY}-${currentSkill}`;
    if (!state.dailyCompleted[key]) {
      state.dailyCompleted[key] = true;
      if (correct) state.completed += 1;
      addActivity(`${currentSkill} practice`, correct ? "پاسخ درست" : "تمرین بررسی شد");
      save();
    }

    if ($("nextExercise")) $("nextExercise").hidden = false;
  });

  function showFeedback(message, success) {
    const box = $("answerFeedback");
    if (!box) return;
    box.hidden = false;
    box.textContent = message;
    box.classList.toggle("success", Boolean(success));
    box.classList.toggle("error", !success);
  }

  $("showHint")?.addEventListener("click", () => {
    const box = $("hintFeedback");
    if (!box) return;
    box.hidden = false;
    box.textContent = currentExercise?.hint || "سؤال را با دقت دوباره بخوان.";
  });

  $("nextExercise")?.addEventListener("click", () => {
    if (["reading", "listening"].includes(currentSkill)) {
      const list = exercises[currentSkill];
      const index = list.indexOf(currentExercise);
      currentExercise = list[(index + 1) % list.length];
      selectedAnswer = null;
      if (currentSkill === "reading") renderReading();
      else renderListening();
      if ($("answerFeedback")) $("answerFeedback").hidden = true;
      if ($("hintFeedback")) $("hintFeedback").hidden = true;
      $("nextExercise").hidden = true;
    }
  });

  /* ---------------- VOCABULARY ---------------- */

  function renderVocabulary() {
    const list = $("vocabularyList");
    if (!list) return;

    currentWordSet = todayWords();
    list.innerHTML = "";

    currentWordSet.forEach((word) => {
      const learned = state.learnedWords.includes(word.word);
      const difficult = state.difficultWords.includes(word.word);
      const card = document.createElement("article");
      card.className = "vocabulary-item content-card";

      card.innerHTML = `
        <div class="card-heading">
          <h3>${escapeHTML(word.word)}</h3>
          <span class="pill-badge">${escapeHTML(word.pronunciation)}</span>
        </div>
        <p><strong>معنی دری:</strong> ${escapeHTML(word.meaning)}</p>
        <p><strong>Example:</strong> ${escapeHTML(word.example)}</p>
        <div class="vocab-actions">
          <button type="button" class="secondary-button vocab-speak">🔊 Pronunciation</button>
          <button type="button" class="secondary-button vocab-difficult">${difficult ? "Remove difficult" : "Mark difficult"}</button>
          <button type="button" class="primary-button vocab-learn">${learned ? "Learned ✓" : "I learned this"}</button>
        </div>
      `;

      card.querySelector(".vocab-speak").addEventListener("click", () => {
        speakEnglish(word.word);
      });

      card.querySelector(".vocab-difficult").addEventListener("click", () => {
        if (state.difficultWords.includes(word.word)) {
          state.difficultWords = state.difficultWords.filter((item) => item !== word.word);
        } else {
          state.difficultWords.push(word.word);
        }
        save();
        renderVocabulary();
      });

      card.querySelector(".vocab-learn").addEventListener("click", () => {
        if (!state.learnedWords.includes(word.word)) {
          state.learnedWords.push(word.word);
          state.completed += 1;
          addActivity("Vocabulary", `Learned: ${word.word}`);
        }
        save();
        renderVocabulary();
      });

      list.appendChild(card);
    });

    const learnedToday = currentWordSet.filter((word) =>
      state.learnedWords.includes(word.word)
    ).length;

    if ($("vocabularyProgressText")) {
      $("vocabularyProgressText").textContent = `${learnedToday} / ${currentWordSet.length}`;
    }
    if ($("vocabularyProgressBar")) {
      $("vocabularyProgressBar").style.width =
        `${(learnedToday / currentWordSet.length) * 100}%`;
    }
    if ($("vocabularyDailyLabel")) {
      $("vocabularyDailyLabel").textContent = `DAY ${dayNumber + 1}`;
    }
  }

  function speakEnglish(text) {
    if (!("speechSynthesis" in window)) {
      babyMessage("پخش تلفظ در این مرورگر پشتیبانی نمی‌شود.");
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.78;
    speechSynthesis.speak(utterance);
  }

  $("reviewDifficultWords")?.addEventListener("click", () => {
    const difficult = vocabulary.filter((word) =>
      state.difficultWords.includes(word.word)
    );

    if (!difficult.length) {
      babyMessage("هنوز لغت دشواری علامت نزده‌ای. هر لغتی سخت بود، دکمهٔ Mark difficult را بزن. 💜");
      return;
    }

    const list = $("vocabularyList");
    list.innerHTML = "";
    difficult.forEach((word) => {
      const card = document.createElement("article");
      card.className = "vocabulary-item content-card";
      card.innerHTML = `
        <h3>${escapeHTML(word.word)}</h3>
        <p>${escapeHTML(word.meaning)}</p>
        <p>${escapeHTML(word.example)}</p>
        <button class="secondary-button" type="button">🔊 Listen</button>
      `;
      card.querySelector("button").addEventListener("click", () => speakEnglish(word.word));
      list.appendChild(card);
    });
    goToSection("vocabulary");
  });

  /* ---------------- WRITING REVIEW ---------------- */

  $("writingAnswer")?.addEventListener("input", () => {
    const text = $("writingAnswer").value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    if ($("writingWordCount")) $("writingWordCount").textContent = `${count} words`;
  });

  $("checkWriting")?.addEventListener("click", () => {
    const text = $("writingAnswer")?.value.trim() || "";
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const feedback = $("writingFeedback");
    if (!feedback) return;

    feedback.hidden = false;

    if (words.length < 20) {
      feedback.textContent =
        "برای بازخورد مفیدتر، پاسخ خود را با دست‌کم ۲۰ کلمه بنویس. " +
        "این بررسی اولیه است و جای تصحیح حرفه‌ای هوش مصنوعی را نمی‌گیرد.";
      return;
    }

    const sentences = text.split(/[.!?]+/).filter((part) => part.trim());
    const suggestions = [];

    if (sentences.length < 3) {
      suggestions.push("پاسخت را به چند جملهٔ روشن تقسیم کن.");
    }
    if (!/\b(because|for example|however|therefore|moreover|first|second)\b/i.test(text)) {
      suggestions.push("از واژه‌های پیونددهنده مانند because، however یا for example استفاده کن.");
    }
    if (!/[.!?]$/.test(text)) {
      suggestions.push("در پایان جمله‌ها از نشانه‌گذاری مناسب استفاده کن.");
    }
    if (words.length < 100) {
      suggestions.push("برای یک پاسخ مفصل‌تر، دلیل‌ها و مثال‌های بیشتری اضافه کن.");
    }
    if (!/\b(I think|I believe|in my opinion|I agree|I disagree)\b/i.test(text)) {
      suggestions.push("موضع اصلی خود را در آغاز پاسخ روشن بیان کن.");
    }

    feedback.innerHTML = `
      <strong>بازخورد اولیهٔ Writing</strong>
      <p>تعداد کلمات: ${words.length} | تعداد جمله‌ها: ${sentences.length}</p>
      <p><strong>نکات پیشنهادی:</strong></p>
      <ul>${(suggestions.length ? suggestions : ["ساختار اولیه خوب به نظر می‌رسد. برای بهترشدن، مثال دقیق و دلیل روشن اضافه کن."])
        .map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
      <p><strong>نسخهٔ تو:</strong></p>
      <p>${escapeHTML(text)}</p>
      <small>این ابزار بررسی مقدماتی انجام می‌دهد؛ دستور زبان را به‌صورت کامل یا قطعی ارزیابی نمی‌کند.</small>
    `;

    state.completed += 1;
    addActivity("Writing", `${words.length} words reviewed`);
    save();
  });

  /* ---------------- SPEAKING RECORDING ---------------- */

  $("startRecording")?.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      $("recordingStatus").textContent =
        "ضبط صدا در این مرورگر پشتیبانی نمی‌شود. سایت را در Safari به‌روز باز کن.";
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunks = [];
      recording = new MediaRecorder(stream);

      recording.addEventListener("dataavailable", (event) => {
        if (event.data.size) recordingChunks.push(event.data);
      });

      recording.addEventListener("stop", () => {
        const blob = new Blob(recordingChunks, { type: recording.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        $("speakingPlayback").src = url;
        $("speakingPlayback").hidden = false;
        $("speakingDownload").href = url;
        $("speakingDownload").download = "beheshta-speaking-practice.webm";
        $("speakingDownload").textContent = "Download my recording";
        $("speakingDownload").hidden = false;
        $("recordingStatus").textContent = "ضبط تمام شد. صدایت را گوش کن یا فایل را دانلود کن.";
        stream.getTracks().forEach((track) => track.stop());
        state.completed += 1;
        addActivity("Speaking", "Recorded speaking practice");
        save();
      });

      recording.start();
      $("startRecording").disabled = true;
      $("stopRecording").disabled = false;
      $("recordingStatus").textContent = "در حال ضبط... هر وقت تمام شد، Stop recording را بزن.";
    } catch (error) {
      $("recordingStatus").textContent =
        "دسترسی به میکروفون داده نشد. اجازهٔ میکروفون را در تنظیمات مرورگر بررسی کن.";
    }
  });

  $("stopRecording")?.addEventListener("click", () => {
    if (recording && recording.state !== "inactive") recording.stop();
    $("startRecording").disabled = false;
    $("stopRecording").disabled = true;
  });

  /* ---------------- PERSONAL STUDY PLAN ---------------- */

  $("plannerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const minutes = Number($("studyMinutes").value);
    const level = $("currentLevel").value;
    const score = $("targetScore").value;
    const weak = $$('input[name="weakSkills"]:checked').map((input) => input.value);
    const selected = weak.length ? weak : ["reading", "listening", "speaking", "writing"];

    const weights = { reading: 0.28, listening: 0.25, speaking: 0.22, writing: 0.25 };
    selected.forEach((skill) => { weights[skill] += 0.15; });
    const totalWeight = selected.reduce((sum, skill) => sum + weights[skill], 0);

    const schedule = selected.map((skill) => ({
      skill,
      minutes: Math.max(5, Math.round(minutes * weights[skill] / totalWeight)),
    }));

    state.plan = {
      minutes,
      level,
      score,
      examDate: $("targetExamDate").value,
      weak: selected,
      schedule,
    };
    save();

    $("plannerResults").hidden = false;
    $("plannerSchedule").innerHTML = `
      <p>سطح فعلی: <strong>${escapeHTML(level)}</strong> · هدف: <strong>${escapeHTML(score)}+</strong></p>
      ${state.plan.examDate ? `<p>تاریخ آزمون: ${escapeHTML(state.plan.examDate)}</p>` : ""}
      <p>برنامهٔ پیشنهادی برای ${minutes} دقیقه در روز:</p>
      <div class="daily-plan-list">
        ${schedule.map((item) => `
          <div class="daily-plan-item">
            <strong>${escapeHTML(item.skill.toUpperCase())}</strong>
            <span>${item.minutes} دقیقه</span>
            <button class="secondary-button plan-open-skill" data-skill="${item.skill}" type="button">شروع</button>
          </div>
        `).join("")}
      </div>
    `;

    $$(".plan-open-skill").forEach((button) => {
      button.addEventListener("click", () => setSkill(button.dataset.skill, true));
    });

    addActivity("Study planner", "Created a personalized plan");
    babyMessage("برنامه‌ات آماده شد بهشته جانم! 💜 از یک بخش شروع کن و قدم‌به‌قدم پیش برو.");
  });

  $("editPlanner")?.addEventListener("click", () => {
    $("plannerResults").hidden = true;
    $("plannerForm")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* ---------------- STUDY TIMER ---------------- */

  function openStudyDialog() {
    const dialog = $("studyStartDialog");
    if (dialog?.showModal) dialog.showModal();
    else goToSection("studyTimerSection");
  }

  $("closeStudyDialog")?.addEventListener("click", () => $("studyStartDialog")?.close());
  $("confirmStudyStart")?.addEventListener("click", () => {
    const minutes = Number($("sessionMinutes")?.value || 60);
    const skill = $("sessionSkill")?.value || "mixed";
    $("studyStartDialog")?.close();

    if (skill !== "mixed" && exercises[skill]) setSkill(skill, true);
    $("timerMinutes").value = String(minutes);
    timerRemaining = minutes * 60;
    startTimer();
    goToSection("studyTimerSection");
    babyMessage(`آفرین بهشته جانم! 💜 جلسهٔ ${minutes} دقیقه‌ای شروع شد. من هر دو دقیقه بهت سر می‌زنم.`);
  });

  function renderTimer() {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    if ($("timerDisplay")) {
      $("timerDisplay").textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerPaused = false;
    timerRemaining = Number($("timerMinutes")?.value || 60) * 60;
    timerEndAt = Date.now() + timerRemaining * 1000;
    sessionStartAt = Date.now();

    if ($("timerStart")) $("timerStart").disabled = true;
    if ($("timerPause")) {
      $("timerPause").disabled = false;
      $("timerPause").textContent = "Pause";
    }
    if ($("timerStatus")) $("timerStatus").textContent = "Focus time";
    if ($("timerMessage")) $("timerMessage").textContent = "加油! با آرامش و تمرکز ادامه بده.";
    renderTimer();

    timerInterval = setInterval(() => {
      if (timerPaused) return;

      timerRemaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
      renderTimer();

      if (timerRemaining <= 0) finishTimer();
    }, 250);
  }

  function pauseTimer() {
    if (!timerPaused) {
      timerRemaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
      timerPaused = true;
      clearInterval(timerInterval);
      if ($("timerPause")) $("timerPause").textContent = "Resume";
      if ($("timerStatus")) $("timerStatus").textContent = "Paused";
      if ($("timerMessage")) $("timerMessage").textContent = "هر وقت آماده بودی، ادامه بده.";
    } else {
      timerPaused = false;
      timerEndAt = Date.now() + timerRemaining * 1000;
      if ($("timerPause")) $("timerPause").textContent = "Pause";
      if ($("timerStatus")) $("timerStatus").textContent = "Focus time";
      timerInterval = setInterval(() => {
        timerRemaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
        renderTimer();
        if (timerRemaining <= 0) finishTimer();
      }, 250);
    }
  }

  function finishTimer() {
    clearInterval(timerInterval);
    timerRemaining = 0;
    renderTimer();
    timerPaused = true;
    if ($("timerStart")) $("timerStart").disabled = false;
    if ($("timerPause")) $("timerPause").disabled = true;
    if ($("timerStatus")) $("timerStatus").textContent = "Session completed";
    if ($("timerMessage")) $("timerMessage").textContent = "زمان درس امروزت تمام شد، موفق باشی. حالا وقت آرامش است. 💜";

    const elapsed = sessionStartAt
      ? Math.max(0, Math.round((Date.now() - sessionStartAt) / 1000))
      : Number($("timerMinutes")?.value || 60) * 60;

    state.totalStudySeconds += elapsed;
    state.completed += 1;
    addActivity("Study session", "Completed a focus session");
    save();

    const dialog = $("studyCompleteDialog");
    if (dialog?.showModal) dialog.showModal();
    else babyMessage("زمان درس امروزت تمام شد، موفق باشی. حالا وقت آرامش و استراحت است. 💜");

    babyMessage("بهشته جانم، زمان درس امروزت تمام شد، موفق باشی. 💜 کمی آب بنوش و استراحت کن.");
  }

  $("timerStart")?.addEventListener("click", startTimer);
  $("timerPause")?.addEventListener("click", pauseTimer);
  $("timerReset")?.addEventListener("click", () => {
    clearInterval(timerInterval);
    timerPaused = true;
    timerRemaining = Number($("timerMinutes")?.value || 60) * 60;
    renderTimer();
    if ($("timerStart")) $("timerStart").disabled = false;
    if ($("timerPause")) {
      $("timerPause").disabled = true;
      $("timerPause").textContent = "Pause";
    }
    if ($("timerStatus")) $("timerStatus").textContent = "Ready to focus?";
    if ($("timerMessage")) $("timerMessage").textContent = "زمان مناسب را انتخاب کن؛ Baby برای شروع آماده است.";
  });

  $("timerMinutes")?.addEventListener("change", () => {
    if (timerPaused) {
      timerRemaining = Number($("timerMinutes").value) * 60;
      renderTimer();
    }
  });

  $("finishStudyButton")?.addEventListener("click", () => {
    $("studyCompleteDialog")?.close();
  });

  /* ---------------- BABY COMPANION ---------------- */

  const nudgeMessages = [
    "بهشته جانم، خسته نشدی؟ برو برات یه چایی یا قهوه بگیر که آروم شی. مشکلی در درس‌ها نداری؟ 💜",
    "بهشته جانم، همین قدم‌های کوچک تو را به هدفت نزدیک می‌کند. حالت خوب است؟",
    "یک نفس عمیق بکش، شانه‌هایت را آرام کن و بعد با تمرکز ادامه بده. 🌷",
    "بهشته جانم، اگر سوالی در Reading یا Listening داری، من اینجا هستم.",
    "یادت نره آب بنوشی و به چشم‌هایت کمی استراحت بدهی. تو می‌توانی! ✨",
    "آفرین به تلاش‌هایت بهشته جانم! لازم نیست کامل باشی؛ فقط پیوسته پیش برو. 💜",
  ];

  function babyMessage(message, openChat = false) {
    const bubble = $("babyNudge");
    if ($("babyNudgeMessage")) $("babyNudgeMessage").textContent = message;

    if (bubble) {
      bubble.hidden = false;
      bubble.classList.add("show");
    }

    if (openChat) openBabyChat();
  }

  function hideNudge() {
    const bubble = $("babyNudge");
    if (bubble) {
      bubble.classList.remove("show");
      bubble.hidden = true;
    }
  }

  function openBabyChat() {
    hideNudge();
    const panel = $("babyChatPanel");
    if (panel) panel.hidden = false;
    $("babyChatInput")?.focus();
  }

  function closeBabyChat() {
    const panel = $("babyChatPanel");
    if (panel) panel.hidden = true;
  }

  [
    "openBaby",
    "topBabyButton",
    "focusBabyButton",
    "babyFloatingButton",
  ].forEach((id) => $(id)?.addEventListener("click", openBabyChat));

  $("nudgeReply")?.addEventListener("click", openBabyChat);
  $("nudgeClose")?.addEventListener("click", hideNudge);
  $("nudgeLater")?.addEventListener("click", hideNudge);
  $("closeBabyChat")?.addEventListener("click", closeBabyChat);

  function startBabyReminders() {
    clearInterval(nudgeInterval);
    lastNudge = Date.now();

    nudgeInterval = setInterval(() => {
      if (document.hidden) return;
      if (!$("babyChatPanel")?.hidden) return;
      if (Date.now() - lastNudge < 115000) return;

      lastNudge = Date.now();
      const message = nudgeMessages[Math.floor(Math.random() * nudgeMessages.length)];
      babyMessage(message);
    }, 5000);
  }

  /* Local helper, not a live AI service. */
  function babyReply(text) {
    const msg = text.toLowerCase();

    if (/راهنما|چطور|استفاده از سایت|گزینه/.test(msg)) {
      return "برای شروع، از بخش «چهار مهارت تافل» یک مهارت انتخاب کن. در Reading و Listening گزینهٔ پاسخ را بزن و Check answer را انتخاب کن. برای برنامهٔ شخصی به «برنامهٔ مطالعه» برو. 💜";
    }
    if (/reading|متن|خواندن/.test(msg)) {
      return "در Reading اول متن را بخوان، بعد سؤال را بررسی کن. از کلمات کلیدی سؤال کمک بگیر و در پایان پاسخ را بررسی کن.";
    }
    if (/listening|شنیدن|صوت|صدا/.test(msg)) {
      return "در Listening روی Play listening audio بزن. بار اول فقط مفهوم کلی را بفهم؛ بار دوم به جزئیات گوش کن. اگر لازم شد Show transcript را باز کن.";
    }
    if (/speaking|صحبت|ضبط|میکروفون/.test(msg)) {
      return "در Speaking سؤال را بخوان، برای آماده‌سازی وقت بگذار و Start recording را بزن. اجازهٔ میکروفون را بده؛ بعد از صحبت Stop recording را انتخاب کن و صدایت را گوش بده.";
    }
    if (/writing|نوشتن|انشا|متن خودم/.test(msg)) {
      return "در Writing پاسخ را انگلیسی بنویس. موضع روشن، دو دلیل، یک مثال و نتیجه‌گیری داشته باش. دکمهٔ Review my writing بازخورد ابتدایی می‌دهد.";
    }
    if (/لغت|واژه|vocabulary|کلمه/.test(msg)) {
      return "در بخش لغات، معنی دری و مثال را بخوان. برای شنیدن تلفظ روی Pronunciation بزن و واژه‌های دشوار را علامت بزن تا دوباره مرور کنی.";
    }
    if (/استراحت|خسته|چای|قهوه|حال/.test(msg)) {
      return "بهشته جانم، چند دقیقه استراحت کن، کمی آب یا چای بنوش و چشم‌هایت را آرام کن. وقتی آماده شدی، با یک قدم کوچک ادامه بده. 💜";
    }
    if (/تایمر|زمان|درس/.test(msg)) {
      return "برای آغاز، Start today's study را بزن، زمان و مهارت را انتخاب کن و جلسه را شروع کن. تایمر را هم می‌توانی از بخش تایمر مطالعه تنظیم کنی.";
    }
    if (/سلام|hello|hi/.test(msg)) {
      return "سلام بهشته جانم! 💜 امروز آماده‌ای یک قدم دیگر به هدف تافلت نزدیک شوی؟ بگو در کدام بخش کمکت کنم.";
    }

    return "بهشته جانم، من در نسخهٔ فعلی راهنمای داخلی سایت هستم. 💜 می‌توانم در استفاده از Reading، Listening، Speaking، Writing، لغات و تایمر راهنمایی‌ات کنم. سوالت را کمی مشخص‌تر بنویس.";
  }

  function appendChatMessage(text, sender) {
    const messages = $("babyChatMessages");
    if (!messages) return;

    const row = document.createElement("div");
    row.className = sender === "user"
      ? "chat-message user-message"
      : "chat-message assistant-message";

    const avatar = document.createElement("span");
    avatar.className = "chat-avatar";
    avatar.textContent = sender === "user" ? "B" : "B";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = text;

    row.append(avatar, bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  $("babyChatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("babyChatInput");
    const text = input?.value.trim();
    if (!text) return;

    appendChatMessage(text, "user");
    input.value = "";

    window.setTimeout(() => {
      appendChatMessage(babyReply(text), "assistant");
    }, 350);
  });

  $$("[data-baby-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.dataset.babyPrompt;
      appendChatMessage(text, "user");
      window.setTimeout(() => appendChatMessage(babyReply(text), "assistant"), 250);
    });
  });

  /* ---------------- PROGRESS + ACTIVITY ---------------- */

  function addActivity(title, description) {
    state.activities.unshift({
      title,
      description,
      date: new Date().toLocaleString(),
    });
    state.activities = state.activities.slice(0, 15);
  }

  function updateProgress() {
    const totalMinutes = Math.floor((state.totalStudySeconds || 0) / 60);

    if ($("totalStudyTime")) $("totalStudyTime").textContent = `${totalMinutes} min`;
    if ($("progressStudyTime")) $("progressStudyTime").textContent = `${totalMinutes} min`;
    if ($("completedExercises")) $("completedExercises").textContent = state.completed || 0;
    if ($("progressExercises")) $("progressExercises").textContent = state.completed || 0;
    if ($("learnedWords")) $("learnedWords").textContent = state.learnedWords.length;
    if ($("progressWords")) $("progressWords").textContent = state.learnedWords.length;
    if ($("streakCount")) $("streakCount").textContent = state.streak || 0;

    const goal = Math.max(1, Number(state.dailyGoal || 60));
    const percent = Math.min(100, Math.round(totalMinutes / goal * 100));
    if ($("dailyGoalProgress")) $("dailyGoalProgress").textContent = `${percent}%`;

    renderActivity();
  }

  function renderActivity() {
    const box = $("activityHistory");
    if (!box) return;

    if (!state.activities.length) {
      box.innerHTML = '<div class="empty-state"><span>↗</span><p>پس از شروع مطالعه، فعالیت‌هایت اینجا ثبت می‌شوند.</p></div>';
      return;
    }

    box.innerHTML = state.activities.map((item) => `
      <div class="daily-plan-item">
        <div>
          <strong>${escapeHTML(item.title)}</strong>
          <p>${escapeHTML(item.description)}</p>
          <small>${escapeHTML(item.date)}</small>
        </div>
      </div>
    `).join("");
  }

  function renderDailyPlan() {
    const box = $("dailyPlanList");
    if (!box) return;

    const tasks = [
      ["reading", "Reading practice", "متن را بخوان و پاسخ بده."],
      ["listening", "Listening practice", "به تمرین صوتی گوش بده."],
      ["speaking", "Speaking practice", "یک پاسخ را با صدای خود ضبط کن."],
      ["writing", "Writing practice", "یک پاسخ کوتاه انگلیسی بنویس."],
      ["vocabulary", "Vocabulary", "پنج واژهٔ امروز را مرور کن."],
    ];

    box.innerHTML = tasks.map(([skill, title, description]) => {
      const done = Boolean(state.dailyCompleted[`${DAY}-${skill}`]);
      return `
        <div class="daily-plan-item">
          <div>
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(description)}</p>
          </div>
          <button type="button" class="secondary-button daily-open" data-skill="${skill}">
            ${done ? "Completed ✓" : "Start"}
          </button>
        </div>
      `;
    }).join("");

    $$(".daily-open").forEach((button) => {
      button.addEventListener("click", () => {
        const skill = button.dataset.skill;
        if (skill === "vocabulary") goToSection("vocabulary");
        else setSkill(skill, true);
      });
    });
  }

  function initializeStreak() {
    if (state.lastVisit !== DAY) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      state.streak = state.lastVisit === yesterday ? (state.streak || 0) + 1 : 1;
      state.lastVisit = DAY;
      save();
    }
  }

  /* ---------------- INITIALIZE ---------------- */

  function initialize() {
    if ($("todayDate")) {
      $("todayDate").textContent = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }

    initializeStreak();
    setSkill("reading");
    renderVocabulary();
    renderDailyPlan();
    renderTimer();
    updateProgress();
    startBabyReminders();

    // A gentle welcome message shortly after opening the site.
    window.setTimeout(() => {
      if (!document.hidden && $("babyChatPanel")?.hidden) {
        babyMessage("سلام بهشته جانم! 💜 خوش آمدی. امروز می‌خواهی با کدام مهارت شروع کنی؟");
      }
    }, 12000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
