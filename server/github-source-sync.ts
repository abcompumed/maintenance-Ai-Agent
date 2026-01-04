import { GitHubManager } from "./github-integration";
import * as fs from "fs";
import * as path from "path";

export interface SourceCodeFile {
  path: string;
  content: string;
  type: "server" | "client" | "database" | "config";
}

export class GitHubSourceCodeSync {
  private manager: GitHubManager;
  private projectRoot: string;

  constructor(manager: GitHubManager, projectRoot: string = process.cwd()) {
    this.manager = manager;
    this.projectRoot = projectRoot;
  }

  /**
   * Sync entire source code to GitHub
   */
  async syncFullSourceCode(): Promise<{
    success: boolean;
    filesSync: number;
    commitSha?: string;
    message: string;
  }> {
    try {
      const files = await this.collectSourceFiles();

      if (files.length === 0) {
        return {
          success: false,
          filesSync: 0,
          message: "No source files found to sync",
        };
      }

      let syncedCount = 0;
      let lastCommitSha: string | undefined = undefined;

      // Sync files in batches
      for (const file of files) {
        try {
          const result = await this.manager.syncSourceCode(
            file.path,
            file.content,
            `Sync: ${file.path}`
          );

          if (result.success) {
            syncedCount++;
            lastCommitSha = result.commitSha;
          }
        } catch (error) {
          console.warn(`Failed to sync ${file.path}:`, error);
          // Continue with next file
        }
      }

      return {
        success: syncedCount > 0,
        filesSync: syncedCount,
        commitSha: lastCommitSha,
        message: `Successfully synced ${syncedCount} of ${files.length} files`,
      };
    } catch (error) {
      console.error("Error syncing source code:", error);
      throw new Error(
        `Failed to sync source code: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Collect all source files to sync
   */
  private async collectSourceFiles(): Promise<SourceCodeFile[]> {
    const files: SourceCodeFile[] = [];

    // Server files
    const serverDir = path.join(this.projectRoot, "server");
    if (fs.existsSync(serverDir)) {
      const serverFiles = await this.collectFilesFromDirectory(serverDir, "server");
      files.push(...serverFiles);
    }

    // Client files
    const clientDir = path.join(this.projectRoot, "client", "src");
    if (fs.existsSync(clientDir)) {
      const clientFiles = await this.collectFilesFromDirectory(clientDir, "client");
      files.push(...clientFiles);
    }

    // Database schema
    const schemaFile = path.join(this.projectRoot, "drizzle", "schema.ts");
    if (fs.existsSync(schemaFile)) {
      const content = fs.readFileSync(schemaFile, "utf-8");
      files.push({
        path: "drizzle/schema.ts",
        content,
        type: "database",
      });
    }

    // Configuration files
    const configFiles = [
      "package.json",
      "tsconfig.json",
      "tailwind.config.ts",
      "vite.config.ts",
      "drizzle.config.ts",
    ];

    for (const configFile of configFiles) {
      const filePath = path.join(this.projectRoot, configFile);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        files.push({
          path: configFile,
          content,
          type: "config",
        });
      }
    }

    return files;
  }

  /**
   * Recursively collect files from a directory
   */
  private async collectFilesFromDirectory(
    dir: string,
    type: "server" | "client"
  ): Promise<SourceCodeFile[]> {
    const files: SourceCodeFile[] = [];
    const excludeDirs = ["node_modules", ".git", "dist", "build", ".next"];

    const walkDir = (currentPath: string, relativePath: string = "") => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (excludeDirs.includes(entry.name)) continue;

        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          walkDir(fullPath, relPath);
        } else if (
          entry.isFile() &&
          this.shouldIncludeFile(entry.name)
        ) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            files.push({
              path: relPath.replace(/\\/g, "/"),
              content,
              type,
            });
          } catch (error) {
            console.warn(`Failed to read file ${fullPath}:`, error);
          }
        }
      }
    };

    walkDir(dir);
    return files;
  }

  /**
   * Check if file should be included in sync
   */
  private shouldIncludeFile(filename: string): boolean {
    const includeExtensions = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".json",
      ".css",
      ".md",
    ];
    const excludePatterns = [".test.", ".spec.", ".d.ts"];

    // Check extension
    const hasValidExtension = includeExtensions.some((ext) =>
      filename.endsWith(ext)
    );

    if (!hasValidExtension) return false;

    // Check exclusion patterns
    const isExcluded = excludePatterns.some((pattern) =>
      filename.includes(pattern)
    );

    return !isExcluded;
  }

  /**
   * Create a README for the synced repository
   */
  async createRepositoryReadme(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const readmeContent = `# ABCompuMed - AI Medical Device Maintenance Agent

## Overview
ABCompuMed is an intelligent AI-powered system for analyzing medical device faults, searching specialized forums and maintenance databases, and providing comprehensive repair solutions with a self-learning knowledge base.

## Features
- **AI-Powered Fault Analysis**: Advanced LLM integration for intelligent fault diagnosis
- **OCR Document Processing**: Extract text from maintenance manuals, service guides, and technical documents
- **Forum & Web Search**: Intelligent scraping of specialized maintenance forums and websites
- **Self-Learning Knowledge Base**: Automatically builds and improves from discovered solutions
- **GitHub Integration**: Automatic issue creation and PR generation for solutions
- **Subscription Management**: Flexible pricing tiers with PayPal integration
- **Forum Credentials**: Secure storage of forum credentials for authorized searching
- **Admin Dashboard**: Comprehensive management interface

## Technology Stack
- **Frontend**: React 19, Tailwind CSS 4, TypeScript
- **Backend**: Express 4, tRPC 11, Node.js
- **Database**: MySQL/TiDB with Drizzle ORM
- **AI/LLM**: Integrated LLM for fault analysis
- **Authentication**: Manus OAuth + GitHub OAuth
- **Storage**: S3 for file storage

## Project Structure
\`\`\`
├── client/              # React frontend application
│   └── src/
│       ├── pages/       # Page components
│       ├── components/  # Reusable UI components
│       └── lib/         # Utilities and hooks
├── server/              # Express backend
│   ├── routers/         # tRPC route definitions
│   ├── ai-agent.ts      # AI fault analysis logic
│   ├── github-integration.ts  # GitHub API integration
│   └── web-scraper.ts   # Web scraping utilities
├── drizzle/             # Database schema and migrations
└── package.json         # Dependencies
\`\`\`

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL/TiDB database
- GitHub Personal Access Token (for GitHub integration)
- PayPal API credentials (for payments)

### Installation
\`\`\`bash
pnpm install
pnpm db:push
pnpm dev
\`\`\`

### Environment Variables
See \`.env.example\` for required environment variables.

## API Routes
- \`/api/trpc/faults.*\` - Fault analysis and knowledge base
- \`/api/trpc/documents.*\` - Document upload and OCR
- \`/api/trpc/search.*\` - Web search and source management
- \`/api/trpc/github.*\` - GitHub integration
- \`/api/trpc/subscriptions.*\` - Subscription management
- \`/api/trpc/forumCredentials.*\` - Forum credential management

## Contributing
This project is maintained by the ABCompuMed team. For issues and feature requests, please create an issue in this repository.

## License
MIT

## Support
For support, contact: Support@abcompumed.shop

---
*Last synced: ${new Date().toISOString()}*
`;

      const result = await this.manager.createDocumentation(
        "README.md",
        "ABCompuMed - AI Medical Device Maintenance Agent",
        readmeContent,
        "Add comprehensive README"
      );

      return {
        success: result.success,
        message: "Repository README created successfully",
      };
    } catch (error) {
      console.error("Error creating README:", error);
      throw new Error(
        `Failed to create README: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
