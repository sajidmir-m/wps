import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseQuestions } from "../lib/exam";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const rawPaper = `# Web Development, GitHub, Vercel & AI — 50 MCQs

## Part A — Introduction to Web Development

### 1. What is the Internet?

A. A collection of only websites
B. A global network of interconnected computers that can exchange data
C. A programming language used for websites
D. A software application used to browse websites

**Answer: B**

### 2. What is the World Wide Web (WWW)?

A. The physical network connecting computers
B. A system of interlinked web pages that runs on top of the Internet
C. A type of database
D. A programming language

**Answer: B**

### 3. Which statement correctly describes the relationship between the Internet and the Web?

A. The Internet and Web are exactly the same
B. The Internet runs on top of the Web
C. The Web is one of the services that runs on the Internet
D. The Web is used only for email

**Answer: C**

### 4. Which protocol is used by the World Wide Web for communication?

A. HTTP
B. DNS
C. SMTP
D. FTP

**Answer: A**

### 5. What is the main difference between a website and a web application?

A. A website is generally informational, while a web application is interactive
B. A website cannot use a browser
C. A web application cannot store data
D. There is no difference between them

**Answer: A**

### 6. Which of the following is an example of a web application?

A. A simple company information page
B. A static brochure website
C. Gmail
D. A plain text document

**Answer: C**

### 7. What is the frontend of a web application?

A. The database server
B. Everything the user sees and interacts with in the browser
C. The server's operating system
D. The DNS system

**Answer: B**

### 8. What is the primary responsibility of the backend?

A. Displaying content directly to the user
B. Handling business logic, security, and data processing
C. Translating domain names
D. Designing computer hardware

**Answer: B**

### 9. What is the main purpose of a database?

A. To store and retrieve persistent application data
B. To display web pages
C. To translate domain names
D. To replace the browser

**Answer: A**

### 10. Which three components form the basic three-layer architecture described in the syllabus?

A. Browser, Internet, DNS
B. Frontend, Backend, Database
C. HTML, CSS, GitHub
D. Domain, Server, Browser

**Answer: B**

### 11. In a client-server architecture, what does the client normally do?

A. Sends requests to the server
B. Directly manages the server's database
C. Controls the DNS system
D. Hosts every website

**Answer: A**

### 12. What does the server do after receiving a request?

A. Ignores the request
B. Processes the request and sends a response
C. Always sends the request to another browser
D. Deletes the database

**Answer: B**

### 13. According to the client-server model, how does the client access persistent database data?

A. Directly
B. Through the server
C. Through CSS
D. Through the domain name

**Answer: B**

### 14. Which of the following is an example of a browser?

A. Chrome
B. PostgreSQL
C. Git
D. Vercel

**Answer: A**

### 15. What does a browser do?

A. Renders web content and sends network requests
B. Stores the application's permanent database
C. Replaces the backend
D. Creates IP addresses

**Answer: A**

### 16. What is HTTP?

A. A database system
B. A set of rules used for communication between browsers and servers
C. A programming language
D. A hosting company

**Answer: B**

### 17. What is the main purpose of HTTPS?

A. To make websites colorful
B. To encrypt data transmitted between the client and server
C. To store database records
D. To create domain names

**Answer: B**

### 18. Why is HTTPS particularly important for applications handling passwords and payments?

A. It makes the website smaller
B. It protects sensitive data while it is being transmitted
C. It removes the need for a backend
D. It automatically creates backups

**Answer: B**

### 19. What is a request-response cycle?

A. The client sends a request and the server returns a response
B. The server sends a request to the browser and the browser deletes it
C. The database sends an email to the client
D. The browser communicates only with DNS

**Answer: A**

### 20. Which of the following can be included in a web request?

A. URL, method, headers, and optionally a body
B. Only a password
C. Only a database
D. Only an IP address

**Answer: A**

### 21. Which of the following can be included in a server response?

A. Status code, headers, and body
B. Only a URL
C. Only a domain
D. Only a browser

**Answer: A**

### 22. What is a domain name?

A. A human-readable address for a website
B. A database table
C. A programming language
D. A Git commit

**Answer: A**

### 23. What is the purpose of DNS?

A. To store website source code
B. To translate domain names into IP addresses
C. To create APIs
D. To encrypt passwords

**Answer: B**

### 24. What is web hosting?

A. A service that stores website files and keeps them available online
B. A programming language
C. A browser extension
D. A database query

**Answer: A**

### 25. When a user types a website URL into a browser, which sequence best represents the general process?

A. Browser request → server processing → server response → browser displays result
B. Database → keyboard → browser → DNS
C. Server → monitor → database → browser
D. GitHub → CSS → keyboard → server

**Answer: A**

---

## Part B — Git & GitHub

### 26. What is Git?

A. A version control system used to track changes in projects
B. A web browser
C. A hosting provider
D. A database

**Answer: A**

### 27. What is GitHub?

A. A platform for hosting Git repositories and collaborating on code
B. A programming language
C. A database engine
D. A DNS provider only

**Answer: A**

### 28. What is a repository?

A. A location where a project's files and version history are maintained
B. A web browser
C. A database password
D. An API response

**Answer: A**

### 29. What is the purpose of the first Git commit in a new project?

A. To record the initial version of the project
B. To deploy the project to Vercel automatically
C. To create a domain
D. To create an API

**Answer: A**

### 30. What does pushing code to GitHub mean?

A. Uploading committed changes from the local repository to the remote repository
B. Downloading code from GitHub
C. Deleting the local project
D. Creating a new database

**Answer: A**

### 31. When pushing a project to GitHub for the first time, what is an important step?

A. Connect the local Git repository to the appropriate remote GitHub repository
B. Delete the \`.git\` folder
C. Remove all project files
D. Create a new browser

**Answer: A**

### 32. After making new changes to a project that is already connected to GitHub, what is generally required before pushing?

A. Commit the new changes
B. Create another GitHub account
C. Delete the repository
D. Reinstall Git

**Answer: A**

### 33. What is the main difference between the first push and a second push?

A. The first establishes the initial remote code history; the second sends newly committed changes
B. The second push requires a new repository every time
C. The first push cannot contain source code
D. There is no version history after the first push

**Answer: A**

### 34. Why is committing changes before pushing important?

A. It records the changes in Git's version history
B. It changes the domain name
C. It creates a database
D. It automatically writes the application

**Answer: A**

### 35. A developer changes three files after the first GitHub push. What is the normal workflow for updating GitHub?

A. Stage the changes, commit them, and push the new commit
B. Create a completely new repository
C. Delete the old commits
D. Upload screenshots instead of code

**Answer: A**

---

## Part C — Vercel & Environment Variables

### 36. What is Vercel commonly used for?

A. Deploying and hosting web applications
B. Writing database queries only
C. Creating computer hardware
D. Replacing Git

**Answer: A**

### 37. What is the benefit of connecting a GitHub repository to Vercel?

A. Vercel can use the repository as the source for deployments
B. GitHub is no longer needed for version control
C. Vercel converts the application into a database
D. It removes the project's source code

**Answer: A**

### 38. What can happen when new code is pushed to a GitHub repository connected to Vercel?

A. Vercel can detect the change and create a new deployment
B. The GitHub repository is deleted
C. The database is automatically removed
D. The domain stops working permanently

**Answer: A**

### 39. What is an environment variable?

A. A configuration value provided to an application through its environment
B. A CSS property
C. A GitHub repository
D. A browser tab

**Answer: A**

### 40. Why are environment variables commonly used in web applications?

A. To store configuration values such as API keys and service URLs outside the source code
B. To replace all application code
C. To create HTML pages
D. To make the monitor brighter

**Answer: A**

### 41. What is the purpose of an \`.env\` file?

A. To store environment-specific configuration values
B. To store images only
C. To create GitHub repositories
D. To define HTML structure

**Answer: A**

### 42. Why should sensitive values such as secret API keys generally not be hard-coded into source code?

A. They could be exposed if the source code becomes accessible
B. They make HTML invalid
C. They prevent browsers from opening websites
D. They delete Git history

**Answer: A**

### 43. Where can environment variables be configured for a Vercel project?

A. In the project's Vercel settings
B. Only inside the browser's address bar
C. Inside DNS only
D. Inside GitHub comments

**Answer: A**

### 44. What can happen if an application requires an environment variable but it is not configured in Vercel?

A. The deployed application may fail to build or function correctly
B. The application will automatically create the missing value
C. GitHub will delete the repository
D. The domain will automatically change

**Answer: A**

### 45. Why might a developer use different environment variables for local development and production?

A. Different environments may use different services, URLs, or credentials
B. GitHub requires two browsers
C. HTML requires two versions
D. DNS creates different programming languages

**Answer: A**

---

## Part D — API

### 46. What is an API?

A. A mechanism that allows different software systems to communicate with each other
B. A type of monitor
C. A GitHub repository
D. A database password

**Answer: A**

### 47. In a typical web application, what can an API allow the frontend to do?

A. Communicate with backend services and exchange data
B. Physically change the server hardware
C. Replace the operating system
D. Create a new browser

**Answer: A**

### 48. Why are APIs important in modern web applications?

A. They provide a structured way for different parts of a system or different systems to communicate
B. They eliminate the need for users
C. They replace all databases
D. They are used only for website colors

**Answer: A**

---

## Part E — AI, LLM, NLP & CNN

### 49. What is Artificial Intelligence (AI)?

A. Technology that enables computers or machines to perform tasks that normally require human-like intelligence
B. A type of database
C. A GitHub feature
D. A web hosting service

**Answer: A**

### 50. Which option correctly matches the concepts AI, LLM, NLP, and CNN?

A. AI is the broad field; LLMs process and generate language; NLP focuses on human language; CNNs are neural networks commonly used for image-related tasks
B. AI is a database; LLM is a browser; NLP is hosting; CNN is GitHub
C. AI is only used for websites; LLM is a DNS system; NLP is a server; CNN is an API
D. AI, LLM, NLP, and CNN are all different names for Git

**Answer: A**
`;

async function main() {
  console.log("Checking admin profile in database...");
  const { data: adminProfiles, error: adminErr } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("role", "ADMIN")
    .limit(1);

  if (adminErr || !adminProfiles?.length) {
    console.error("No ADMIN user found in profiles table:", adminErr?.message || "empty");
    process.exit(1);
  }

  const admin = adminProfiles[0];
  console.log(`Using admin: ${admin.name} (${admin.email}, ID: ${admin.id})`);

  const { questions, errors } = parseQuestions(rawPaper);
  if (errors.length) {
    console.error("Parse errors:", errors);
    process.exit(1);
  }
  console.log(`Parsed ${questions.length} questions successfully.`);

  const title = "Web Development, GitHub, Vercel & AI";

  // Check if exam already exists
  const { data: existingExams } = await supabase
    .from("exams")
    .select("id, title")
    .eq("title", title);

  let examId = existingExams?.[0]?.id;

  if (examId) {
    console.log(`Found existing exam "${title}" (ID: ${examId}). Updating questions...`);
    // Delete existing questions to re-seed cleanly
    await supabase.from("exam_questions").delete().eq("exam_id", examId);
  } else {
    console.log(`Creating new exam: "${title}"...`);
    const { data: newExam, error: createErr } = await supabase
      .from("exams")
      .insert({
        title,
        instructions:
          "50 Multiple Choice Questions covering Web Development, Git, GitHub, Vercel, APIs, and AI concepts. Do not leave the exam window. Each correct answer carries +1 mark and each wrong answer deducts -0.25 marks.",
        duration_minutes: 50,
        marks_correct: 1,
        marks_wrong: 0.25,
        status: "PUBLISHED",
        group_id: null, // open for all groups
        created_by: admin.id,
      })
      .select("id")
      .single();

    if (createErr || !newExam) {
      console.error("Failed to create exam:", createErr);
      process.exit(1);
    }
    examId = newExam.id;
    console.log(`Created exam with ID: ${examId}`);
  }

  console.log(`Inserting ${questions.length} questions into exam_questions...`);
  const rows = questions.map((q, index) => ({
    exam_id: examId,
    position: index,
    text: q.text,
    options: q.options,
    correct_index: q.correctIndex,
  }));

  const { error: insertErr } = await supabase.from("exam_questions").insert(rows);

  if (insertErr) {
    console.error("Failed to insert questions:", insertErr);
    process.exit(1);
  }

  console.log(`Successfully seeded ${questions.length} questions into "${title}" (status: PUBLISHED)!`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
