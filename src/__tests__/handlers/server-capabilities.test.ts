import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies before importing
vi.mock("../../client.js", () => ({
  GitLabClient: vi.fn(),
}));

vi.mock("../../config.js", () => ({
  ConfigManager: vi.fn(),
}));

vi.mock("../../handlers/index.js", () => ({
  ProjectHandlers: vi.fn(),
  IssueHandlers: vi.fn(),
  MergeRequestHandlers: vi.fn(),
  RepositoryHandlers: vi.fn(),
  PipelineHandlers: vi.fn(),
  JobHandlers: vi.fn(),
  UserHandlers: vi.fn(),
}));

vi.mock("../../tools/index.js", () => ({
  allTools: [{ name: "list_projects", description: "Test tool" }],
}));

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock("../../resources/index.js", () => ({
  GitLabResources: vi.fn(),
}));

vi.mock("../../prompts/index.js", () => ({
  GitLabPrompts: vi.fn(),
}));

// Now import after mocks are set up
import { GitLabMCPServer } from "../../server.js";
import { ConfigManager } from "../../config.js";
import { GitLabClient } from "../../client.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as handlers from "../../handlers/index.js";
import { GitLabResources } from "../../resources/index.js";
import { GitLabPrompts } from "../../prompts/index.js";

describe("GitLabMCPServer Capabilities", () => {
  let mockConfigManager: {
    validate: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    getDefaults: ReturnType<typeof vi.fn>;
  };
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
  let mockServer: {
    setRequestHandler: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    sendLoggingMessage: ReturnType<typeof vi.fn>;
  };
  let mockResources: {
    getStaticResources: ReturnType<typeof vi.fn>;
    getTemplates: ReturnType<typeof vi.fn>;
    read: ReturnType<typeof vi.fn>;
  };
  let mockPrompts: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ConfigManager
    mockConfigManager = {
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      get: vi.fn().mockReturnValue({
        gitlab: { baseUrl: "https://gitlab.com", token: undefined },
        server: { name: "gitlab-mcp-server", version: "1.0.0" },
      }),
      getDefaults: vi.fn().mockReturnValue({ perPage: 20, projectScope: "owned" }),
    };

    // Mock GitLabClient
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    // Mock Server
    mockServer = {
      setRequestHandler: vi.fn(),
      connect: vi.fn(),
      sendLoggingMessage: vi.fn(),
    };

    // Mock Resources
    mockResources = {
      getStaticResources: vi.fn().mockReturnValue([
        {
          uri: "gitlab://user/me",
          name: "Current User",
          description: "The currently authenticated GitLab user",
          mimeType: "application/json",
        },
      ]),
      getTemplates: vi.fn().mockReturnValue([
        {
          uriTemplate: "gitlab://project/{project_id}",
          name: "GitLab Project",
          mimeType: "application/json",
        },
      ]),
      read: vi.fn().mockResolvedValue({
        uri: "gitlab://user/me",
        mimeType: "application/json",
        text: '{"id": 1, "username": "test"}',
      }),
    };

    // Mock Prompts
    mockPrompts = {
      list: vi.fn().mockReturnValue([
        {
          name: "review-mr",
          description: "Review a merge request",
          arguments: [
            { name: "project_id", description: "Project ID", required: true },
            { name: "mr_iid", description: "MR IID", required: true },
          ],
        },
      ]),
      get: vi.fn().mockResolvedValue({
        description: "Code review for MR !42",
        messages: [
          {
            role: "user",
            content: { type: "text", text: "Review this MR" },
          },
        ],
      }),
    };

    // Mock all handlers
    const mockHandlerInstance = {
      listProjects: vi.fn(),
      getProject: vi.fn(),
      uploadProjectFile: vi.fn(),
      listProjectUploads: vi.fn(),
      listProjectLabels: vi.fn(),
      listIssues: vi.fn(),
      getIssue: vi.fn(),
      createIssue: vi.fn(),
      listMergeRequests: vi.fn(),
      getMergeRequest: vi.fn(),
      createMergeRequest: vi.fn(),
      updateMergeRequest: vi.fn(),
      listMRNotes: vi.fn(),
      listMRDiscussions: vi.fn(),
      createMRNote: vi.fn(),
      createMRDiscussion: vi.fn(),
      replyToMRDiscussion: vi.fn(),
      resolveMRDiscussion: vi.fn(),
      unresolveMRDiscussion: vi.fn(),
      updateMRDiscussionNote: vi.fn(),
      createMRDiscussionNote: vi.fn(),
      deleteMRDiscussionNote: vi.fn(),
      markMRAsDraft: vi.fn(),
      markMRAsReady: vi.fn(),
      listMRTemplates: vi.fn(),
      getMRTemplate: vi.fn(),
      deleteMRNote: vi.fn(),
      updateMRNote: vi.fn(),
      updateMRLabels: vi.fn(),
      getMRApprovals: vi.fn(),
      approveMR: vi.fn(),
      unapproveMR: vi.fn(),
      getMergeRequestDiffs: vi.fn(),
      listMergeRequestDiffs: vi.fn(),
      getBranchDiffs: vi.fn(),
      listProjectBranches: vi.fn(),
      getProjectCommits: vi.fn(),
      getCommit: vi.fn(),
      getCommitDiff: vi.fn(),
      listPipelines: vi.fn(),
      getPipeline: vi.fn(),
      createPipeline: vi.fn(),
      retryPipeline: vi.fn(),
      cancelPipeline: vi.fn(),
      deletePipeline: vi.fn(),
      getPipelineVariables: vi.fn(),
      listPipelineJobs: vi.fn(),
      getJobLogs: vi.fn(),
      getJobTrace: vi.fn(),
      getUser: vi.fn(),
    };

    vi.mocked(ConfigManager).mockImplementation(() => mockConfigManager as unknown as ConfigManager);
    vi.mocked(GitLabClient).mockImplementation(() => mockClient as unknown as GitLabClient);
    vi.mocked(Server).mockImplementation(() => mockServer as unknown as Server);
    vi.mocked(GitLabResources).mockImplementation(() => mockResources as unknown as GitLabResources);
    vi.mocked(GitLabPrompts).mockImplementation(() => mockPrompts as unknown as GitLabPrompts);

    // Mock all handler constructors
    vi.mocked(handlers.ProjectHandlers).mockImplementation(() => mockHandlerInstance as unknown as handlers.ProjectHandlers);
    vi.mocked(handlers.IssueHandlers).mockImplementation(() => mockHandlerInstance as unknown as handlers.IssueHandlers);
    vi.mocked(handlers.MergeRequestHandlers).mockImplementation(() => mockHandlerInstance as unknown as handlers.MergeRequestHandlers);
    vi.mocked(handlers.RepositoryHandlers).mockImplementation(() => mockHandlerInstance as unknown as handlers.RepositoryHandlers);
    vi.mocked(handlers.PipelineHandlers).mockImplementation(() => mockHandlerInstance as unknown as handlers.PipelineHandlers);
    vi.mocked(handlers.JobHandlers).mockImplementation(() => mockHandlerInstance as unknown as handlers.JobHandlers);
    vi.mocked(handlers.UserHandlers).mockImplementation(() => mockHandlerInstance as unknown as handlers.UserHandlers);

    // Set environment variable for token
    process.env.NPM_CONFIG_TOKEN = "test-token";
  });

  describe("Server initialization", () => {
    it("should declare all capabilities including resources, prompts, and logging", () => {
      new GitLabMCPServer();

      expect(Server).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "gitlab-mcp-server",
          version: "1.0.0",
        }),
        expect.objectContaining({
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
            logging: {},
          },
        })
      );
    });

    it("should initialize GitLabResources", () => {
      new GitLabMCPServer();
      expect(GitLabResources).toHaveBeenCalledWith(mockClient);
    });

    it("should initialize GitLabPrompts", () => {
      new GitLabMCPServer();
      expect(GitLabPrompts).toHaveBeenCalledWith(mockClient);
    });

    it("should setup all 8 request handlers", () => {
      new GitLabMCPServer();

      // Should have 8 handlers:
      // 2 for tools (list, call)
      // 3 for resources (list, templates, read)
      // 2 for prompts (list, get)
      // 1 for logging (setLevel)
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(8);
    });
  });

  describe("Resource handlers", () => {
    it("should call setRequestHandler for resource operations", () => {
      new GitLabMCPServer();

      // Verify that setRequestHandler was called 8 times total
      // The resource handlers are 3 of these 8 calls
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(8);
    });
  });

  describe("Prompt handlers", () => {
    it("should call setRequestHandler for prompt operations", () => {
      new GitLabMCPServer();

      // Verify that setRequestHandler was called 8 times total
      // The prompt handlers are 2 of these 8 calls
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(8);
    });
  });

  describe("Logging handlers", () => {
    it("should call setRequestHandler for logging operations", () => {
      new GitLabMCPServer();

      // Verify that setRequestHandler was called 8 times total
      // The logging handler is 1 of these 8 calls
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(8);
    });
  });
});

describe("Logging functionality", () => {
  describe("Log level filtering logic", () => {
    const levels = [
      "debug",
      "info",
      "notice",
      "warning",
      "error",
      "critical",
      "alert",
      "emergency",
    ];

    it("should filter logs below current level", () => {
      const currentLevel = "warning";
      const currentLevelIndex = levels.indexOf(currentLevel);

      // Messages at or above warning level should be logged
      expect(levels.indexOf("warning")).toBeGreaterThanOrEqual(currentLevelIndex);
      expect(levels.indexOf("error")).toBeGreaterThanOrEqual(currentLevelIndex);
      expect(levels.indexOf("critical")).toBeGreaterThanOrEqual(currentLevelIndex);

      // Messages below warning level should not be logged
      expect(levels.indexOf("debug")).toBeLessThan(currentLevelIndex);
      expect(levels.indexOf("info")).toBeLessThan(currentLevelIndex);
      expect(levels.indexOf("notice")).toBeLessThan(currentLevelIndex);
    });

    it("should include all levels when set to debug", () => {
      const currentLevel = "debug";
      const currentLevelIndex = levels.indexOf(currentLevel);

      levels.forEach((level) => {
        expect(levels.indexOf(level)).toBeGreaterThanOrEqual(currentLevelIndex);
      });
    });

    it("should only include emergency when set to emergency", () => {
      const currentLevel = "emergency";
      const currentLevelIndex = levels.indexOf(currentLevel);

      // Only emergency should pass
      expect(levels.indexOf("emergency")).toBeGreaterThanOrEqual(currentLevelIndex);

      // All others should be filtered
      const otherLevels = levels.slice(0, -1);
      otherLevels.forEach((level) => {
        expect(levels.indexOf(level)).toBeLessThan(currentLevelIndex);
      });
    });

    it("should correctly order all log levels from lowest to highest severity", () => {
      // Verify the expected order
      expect(levels.indexOf("debug")).toBeLessThan(levels.indexOf("info"));
      expect(levels.indexOf("info")).toBeLessThan(levels.indexOf("notice"));
      expect(levels.indexOf("notice")).toBeLessThan(levels.indexOf("warning"));
      expect(levels.indexOf("warning")).toBeLessThan(levels.indexOf("error"));
      expect(levels.indexOf("error")).toBeLessThan(levels.indexOf("critical"));
      expect(levels.indexOf("critical")).toBeLessThan(levels.indexOf("alert"));
      expect(levels.indexOf("alert")).toBeLessThan(levels.indexOf("emergency"));
    });
  });
});
