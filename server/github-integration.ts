import { Octokit } from "@octokit/rest";
import { decryptData } from "./encryption";

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

export class GitHubManager {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  /**
   * Create an issue for a fault
   */
  async createFaultIssue(
    faultTitle: string,
    faultDescription: string,
    deviceType: string,
    manufacturer: string,
    deviceModel: string,
    rootCause?: string,
    solution?: string
  ) {
    try {
      const body = `## Device Information
- **Type:** ${deviceType}
- **Manufacturer:** ${manufacturer}
- **Model:** ${deviceModel}

## Fault Description
${faultDescription}

${rootCause ? `## Root Cause\n${rootCause}\n` : ""}
${solution ? `## Solution\n${solution}\n` : ""}

---
*This issue was automatically created by ABCompuMed AI Agent*`;

      const response = await this.octokit.issues.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title: `[${deviceType}] ${faultTitle}`,
        body,
        labels: ["fault", "auto-generated", deviceType.toLowerCase()],
      });

      return {
        success: true,
        issueNumber: response.data.number,
        issueUrl: response.data.html_url,
      };
    } catch (error) {
      console.error("Error creating GitHub issue:", error);
      throw new Error(
        `Failed to create GitHub issue: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create a pull request with fault solution
   */
  async createSolutionPR(
    faultId: number,
    faultTitle: string,
    markdownContent: string,
    deviceType: string
  ) {
    try {
      const branchName = `fault/${faultId}-${deviceType.toLowerCase().replace(/\s+/g, "-")}`;
      const filePath = `faults/${deviceType.toLowerCase()}/${faultId}-${faultTitle.toLowerCase().replace(/\s+/g, "-")}.md`;

      // Get the default branch
      const repo = await this.octokit.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });

      const defaultBranch = repo.data.default_branch;

      // Get the latest commit of the default branch
      const ref = await this.octokit.git.getRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `heads/${defaultBranch}`,
      });

      const latestCommitSha = ref.data.object.sha;

      // Create a new branch
      await this.octokit.git.createRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `refs/heads/${branchName}`,
        sha: latestCommitSha,
      });

      // Create the file in the new branch
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: filePath,
        message: `Add fault solution: ${faultTitle}`,
        content: Buffer.from(markdownContent).toString("base64"),
        branch: branchName,
      });

      // Create a pull request
      const pr = await this.octokit.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title: `[Solution] ${faultTitle}`,
        body: `## Fault Solution\n\n${markdownContent}\n\n---\n*This PR was automatically created by ABCompuMed AI Agent*`,
        head: branchName,
        base: defaultBranch,
      });

      return {
        success: true,
        prNumber: pr.data.number,
        prUrl: pr.data.html_url,
        branch: branchName,
      };
    } catch (error) {
      console.error("Error creating GitHub PR:", error);
      throw new Error(
        `Failed to create GitHub PR: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Sync source code to GitHub
   */
  async syncSourceCode(
    sourceCodePath: string,
    sourceCodeContent: string,
    commitMessage: string
  ) {
    try {
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: sourceCodePath,
        message: commitMessage,
        content: Buffer.from(sourceCodeContent).toString("base64"),
      });

      return {
        success: true,
        commitSha: response.data.commit.sha,
        fileUrl: response.data.content?.html_url || "",
      };
    } catch (error) {
      console.error("Error syncing source code:", error);
      throw new Error(
        `Failed to sync source code: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Search GitHub repositories for maintenance guides
   */
  async searchRepositories(query: string, deviceType?: string) {
    try {
      const searchQuery = deviceType
        ? `${query} ${deviceType} maintenance guide`
        : `${query} maintenance guide`;

      const response = await this.octokit.search.repos({
        q: searchQuery,
        sort: "stars",
        order: "desc",
        per_page: 10,
      });

      return {
        success: true,
        results: response.data.items.map((repo) => ({
          name: repo.name,
          url: repo.html_url,
          description: repo.description,
          stars: repo.stargazers_count,
          language: repo.language,
          topics: repo.topics || [],
        })),
      };
    } catch (error) {
      console.error("Error searching GitHub repositories:", error);
      throw new Error(
        `Failed to search GitHub repositories: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo() {
    try {
      const response = await this.octokit.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });

      return {
        success: true,
        name: response.data.name,
        url: response.data.html_url,
        description: response.data.description,
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        defaultBranch: response.data.default_branch,
      };
    } catch (error) {
      console.error("Error getting repository info:", error);
      throw new Error(
        `Failed to get repository info: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create a markdown documentation file
   */
  async createDocumentation(
    filePath: string,
    title: string,
    content: string,
    commitMessage: string
  ) {
    try {
      const markdownContent = `# ${title}\n\n${content}`;

      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: filePath,
        message: commitMessage,
        content: Buffer.from(markdownContent).toString("base64"),
      });

      return {
        success: true,
        commitSha: response.data.commit.sha,
        fileUrl: response.data.content?.html_url || "",
      };
    } catch (error) {
      console.error("Error creating documentation:", error);
      throw new Error(
        `Failed to create documentation: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * List issues in the repository
   */
  async listIssues(state: "open" | "closed" | "all" = "open") {
    try {
      const response = await this.octokit.issues.listForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        state,
        per_page: 50,
      });

      return {
        success: true,
        issues: response.data.map((issue) => ({
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          state: issue.state,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
        })),
      };
    } catch (error) {
      console.error("Error listing issues:", error);
      throw new Error(
        `Failed to list issues: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * List pull requests in the repository
   */
  async listPullRequests(state: "open" | "closed" | "all" = "open") {
    try {
      const response = await this.octokit.pulls.list({
        owner: this.config.owner,
        repo: this.config.repo,
        state,
        per_page: 50,
      });

      return {
        success: true,
        pullRequests: response.data.map((pr) => ({
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          state: pr.state,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          branch: pr.head.ref,
        })),
      };
    } catch (error) {
      console.error("Error listing pull requests:", error);
      throw new Error(
        `Failed to list pull requests: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

/**
 * Create GitHub manager from encrypted token
 */
export function createGitHubManager(
  owner: string,
  repo: string,
  encryptedToken: string,
  iv: string
): GitHubManager {
  const token = decryptData(encryptedToken, iv);
  return new GitHubManager({ owner, repo, token });
}
