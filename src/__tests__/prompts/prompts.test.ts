import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitLabPrompts } from "../../prompts/index.js";
import type { GitLabClient } from "../../client.js";

// Mock the GitLab client
const createMockClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getAxios: vi.fn(),
  getWithHeaders: vi.fn(),
  uploadFile: vi.fn(),
});

describe("GitLabPrompts", () => {
  let prompts: GitLabPrompts;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    prompts = new GitLabPrompts(mockClient as unknown as GitLabClient);
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return all available prompts", () => {
      const promptList = prompts.list();

      expect(promptList).toBeInstanceOf(Array);
      expect(promptList.length).toBe(5);

      const promptNames = promptList.map((p) => p.name);
      expect(promptNames).toContain("review-mr");
      expect(promptNames).toContain("analyze-pipeline-failure");
      expect(promptNames).toContain("summarize-mr-changes");
      expect(promptNames).toContain("check-mr-readiness");
      expect(promptNames).toContain("generate-release-notes");
    });

    it("should have correct structure for each prompt", () => {
      const promptList = prompts.list();

      promptList.forEach((prompt) => {
        expect(prompt).toHaveProperty("name");
        expect(prompt).toHaveProperty("description");
        expect(prompt).toHaveProperty("arguments");
        expect(prompt.arguments).toBeInstanceOf(Array);
        expect(prompt.arguments.length).toBeGreaterThan(0);
      });
    });

    it("should have required arguments for review-mr", () => {
      const promptList = prompts.list();
      const reviewMr = promptList.find((p) => p.name === "review-mr");

      expect(reviewMr).toBeDefined();
      expect(reviewMr!.arguments).toHaveLength(2);

      const argNames = reviewMr!.arguments.map((a) => a.name);
      expect(argNames).toContain("project_id");
      expect(argNames).toContain("mr_iid");

      reviewMr!.arguments.forEach((arg) => {
        expect(arg.required).toBe(true);
      });
    });

    it("should have required arguments for analyze-pipeline-failure", () => {
      const promptList = prompts.list();
      const prompt = promptList.find(
        (p) => p.name === "analyze-pipeline-failure"
      );

      expect(prompt).toBeDefined();
      const argNames = prompt!.arguments.map((a) => a.name);
      expect(argNames).toContain("project_id");
      expect(argNames).toContain("pipeline_id");
    });

    it("should have required arguments for generate-release-notes", () => {
      const promptList = prompts.list();
      const prompt = promptList.find(
        (p) => p.name === "generate-release-notes"
      );

      expect(prompt).toBeDefined();
      const argNames = prompt!.arguments.map((a) => a.name);
      expect(argNames).toContain("project_id");
      expect(argNames).toContain("since");
    });
  });

  describe("get - argument validation", () => {
    it("should throw error when project_id is missing for review-mr", async () => {
      await expect(
        prompts.get("review-mr", { mr_iid: "42" })
      ).rejects.toThrow(
        "Missing required arguments for prompt 'review-mr': project_id"
      );
    });

    it("should throw error when mr_iid is missing for review-mr", async () => {
      await expect(
        prompts.get("review-mr", { project_id: "123" })
      ).rejects.toThrow(
        "Missing required arguments for prompt 'review-mr': mr_iid"
      );
    });

    it("should throw error when both arguments are missing for review-mr", async () => {
      await expect(prompts.get("review-mr", {})).rejects.toThrow(
        "Missing required arguments for prompt 'review-mr': project_id, mr_iid"
      );
    });

    it("should throw error when pipeline_id is missing for analyze-pipeline-failure", async () => {
      await expect(
        prompts.get("analyze-pipeline-failure", { project_id: "123" })
      ).rejects.toThrow(
        "Missing required arguments for prompt 'analyze-pipeline-failure': pipeline_id"
      );
    });

    it("should throw error when since is missing for generate-release-notes", async () => {
      await expect(
        prompts.get("generate-release-notes", { project_id: "123" })
      ).rejects.toThrow(
        "Missing required arguments for prompt 'generate-release-notes': since"
      );
    });

    it("should throw error for empty string arguments", async () => {
      await expect(
        prompts.get("review-mr", { project_id: "  ", mr_iid: "42" })
      ).rejects.toThrow(
        "Missing required arguments for prompt 'review-mr': project_id"
      );
    });

    it("should throw error for unknown prompt", async () => {
      await expect(
        prompts.get("unknown-prompt", { project_id: "123" })
      ).rejects.toThrow("Unknown prompt: unknown-prompt");
    });
  });

  describe("get - review-mr prompt", () => {
    const mockMR = {
      title: "Add new feature",
      author: { name: "John Doe" },
      source_branch: "feature/new",
      target_branch: "main",
      state: "opened",
      web_url: "https://gitlab.com/project/-/merge_requests/42",
      description: "This MR adds a new feature",
    };

    const mockDiffs = {
      changes: [
        { new_path: "src/index.ts", diff: "some diff content" },
        { new_path: "src/utils.ts", diff: "other diff" },
      ],
    };

    const mockDiscussions = [
      {
        notes: [
          {
            body: "This looks good",
            author: { name: "Reviewer" },
            resolved: true,
          },
        ],
      },
    ];

    const mockApprovals = {
      approved: true,
      approvals_required: 1,
      approved_by: [{ user: { name: "Approver" } }],
    };

    beforeEach(() => {
      mockClient.get
        .mockResolvedValueOnce(mockMR)
        .mockResolvedValueOnce(mockDiffs)
        .mockResolvedValueOnce(mockDiscussions)
        .mockResolvedValueOnce(mockApprovals);
    });

    it("should fetch all required data for review-mr", async () => {
      const result = await prompts.get("review-mr", {
        project_id: "group/project",
        mr_iid: "42",
      });

      expect(mockClient.get).toHaveBeenCalledTimes(4);
      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/merge_requests/42"
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/merge_requests/42/changes"
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/merge_requests/42/discussions"
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/merge_requests/42/approvals"
      );
    });

    it("should return properly structured prompt result", async () => {
      const result = await prompts.get("review-mr", {
        project_id: "group/project",
        mr_iid: "42",
      });

      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("messages");
      expect(result.description).toContain("Code review for MR !42");
      expect(result.description).toContain("Add new feature");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");
    });

    it("should include MR details in the prompt text", async () => {
      const result = await prompts.get("review-mr", {
        project_id: "group/project",
        mr_iid: "42",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("Add new feature");
      expect(text).toContain("John Doe");
      expect(text).toContain("feature/new");
      expect(text).toContain("main");
      expect(text).toContain("This MR adds a new feature");
    });

    it("should include approval status in the prompt", async () => {
      const result = await prompts.get("review-mr", {
        project_id: "group/project",
        mr_iid: "42",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("Approved:** Yes");
      expect(text).toContain("Approver");
    });
  });

  describe("get - analyze-pipeline-failure prompt", () => {
    const mockPipeline = {
      id: 456,
      status: "failed",
      ref: "main",
      sha: "abc123",
      web_url: "https://gitlab.com/project/-/pipelines/456",
      created_at: "2024-01-01T00:00:00Z",
    };

    const mockJobs = [
      { id: 1, name: "build", stage: "build", status: "success", duration: 60 },
      { id: 2, name: "test", stage: "test", status: "failed", duration: 120 },
    ];

    beforeEach(() => {
      mockClient.get
        .mockResolvedValueOnce(mockPipeline)
        .mockResolvedValueOnce(mockJobs)
        .mockResolvedValueOnce("Error: Test failed\nAssertionError");
    });

    it("should fetch pipeline and job data", async () => {
      const result = await prompts.get("analyze-pipeline-failure", {
        project_id: "group/project",
        pipeline_id: "456",
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/pipelines/456"
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/pipelines/456/jobs"
      );
    });

    it("should fetch traces for failed jobs", async () => {
      const result = await prompts.get("analyze-pipeline-failure", {
        project_id: "group/project",
        pipeline_id: "456",
      });

      // Should fetch trace for the failed job
      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/jobs/2/trace"
      );
    });

    it("should return properly structured result", async () => {
      const result = await prompts.get("analyze-pipeline-failure", {
        project_id: "group/project",
        pipeline_id: "456",
      });

      expect(result.description).toContain("Pipeline failure analysis");
      expect(result.description).toContain("456");
      expect(result.messages).toHaveLength(1);
    });

    it("should include job information in the prompt", async () => {
      const result = await prompts.get("analyze-pipeline-failure", {
        project_id: "group/project",
        pipeline_id: "456",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("build");
      expect(text).toContain("test");
      expect(text).toContain("failed");
      expect(text).toContain("success");
    });
  });

  describe("get - summarize-mr-changes prompt", () => {
    const mockMR = {
      title: "Refactor authentication",
      author: { name: "Developer" },
      labels: ["refactor", "auth"],
      description: "Major refactoring of auth module",
    };

    const mockDiffs = {
      changes: [
        { new_path: "src/auth.ts", new_file: false, deleted_file: false, renamed_file: false },
        { new_path: "src/new-file.ts", new_file: true, deleted_file: false, renamed_file: false },
        { new_path: "src/old-file.ts", new_file: false, deleted_file: true, renamed_file: false },
      ],
    };

    const mockCommits = [
      { short_id: "abc123", title: "First commit" },
      { short_id: "def456", title: "Second commit" },
    ];

    beforeEach(() => {
      mockClient.get
        .mockResolvedValueOnce(mockMR)
        .mockResolvedValueOnce(mockDiffs)
        .mockResolvedValueOnce(mockCommits);
    });

    it("should fetch MR, diffs, and commits", async () => {
      await prompts.get("summarize-mr-changes", {
        project_id: "group/project",
        mr_iid: "42",
      });

      expect(mockClient.get).toHaveBeenCalledTimes(3);
      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/merge_requests/42"
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/merge_requests/42/changes"
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/merge_requests/42/commits"
      );
    });

    it("should include file change actions", async () => {
      const result = await prompts.get("summarize-mr-changes", {
        project_id: "group/project",
        mr_iid: "42",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("[Modified]");
      expect(text).toContain("[Added]");
      expect(text).toContain("[Deleted]");
    });

    it("should include commit information", async () => {
      const result = await prompts.get("summarize-mr-changes", {
        project_id: "group/project",
        mr_iid: "42",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("abc123");
      expect(text).toContain("First commit");
      expect(text).toContain("def456");
      expect(text).toContain("Second commit");
    });
  });

  describe("get - check-mr-readiness prompt", () => {
    const mockMR = {
      title: "Ready MR",
      state: "opened",
      draft: false,
      has_conflicts: false,
      head_pipeline: { status: "success" },
    };

    const mockDiscussions = [
      {
        notes: [{ resolvable: true, resolved: true }],
      },
      {
        notes: [{ resolvable: true, resolved: false }],
      },
    ];

    const mockApprovals = {
      approved: true,
      approvals_required: 1,
      approved_by: [{ user: { name: "Approver" } }],
    };

    beforeEach(() => {
      mockClient.get
        .mockResolvedValueOnce(mockMR)
        .mockResolvedValueOnce(mockDiscussions)
        .mockResolvedValueOnce(mockApprovals);
    });

    it("should check for unresolved discussions", async () => {
      const result = await prompts.get("check-mr-readiness", {
        project_id: "group/project",
        mr_iid: "42",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("Unresolved:** 1");
      expect(text).toContain("Has unresolved discussions");
    });

    it("should include pipeline status", async () => {
      const result = await prompts.get("check-mr-readiness", {
        project_id: "group/project",
        mr_iid: "42",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("success");
      expect(text).toContain("Passed");
    });

    it("should include draft status", async () => {
      const result = await prompts.get("check-mr-readiness", {
        project_id: "group/project",
        mr_iid: "42",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("Draft:** No");
    });
  });

  describe("get - generate-release-notes prompt", () => {
    const mockMRs = [
      {
        iid: 1,
        title: "Add feature A",
        author: { name: "Dev 1" },
        labels: ["feature"],
        description: "New feature",
        merged_at: "2024-01-15T00:00:00Z",
      },
      {
        iid: 2,
        title: "Fix bug B",
        author: { name: "Dev 2" },
        labels: ["bug"],
        description: "Bug fix",
        merged_at: "2024-01-16T00:00:00Z",
      },
    ];

    beforeEach(() => {
      mockClient.get.mockResolvedValueOnce(mockMRs);
    });

    it("should fetch merged MRs with date filter", async () => {
      await prompts.get("generate-release-notes", {
        project_id: "group/project",
        since: "2024-01-01",
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/group%2Fproject/merge_requests?state=merged&updated_after=2024-01-01&per_page=50"
      );
    });

    it("should include all merged MRs in the prompt", async () => {
      const result = await prompts.get("generate-release-notes", {
        project_id: "group/project",
        since: "2024-01-01",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("Add feature A");
      expect(text).toContain("Fix bug B");
      expect(text).toContain("Dev 1");
      expect(text).toContain("Dev 2");
    });

    it("should include labels in the output", async () => {
      const result = await prompts.get("generate-release-notes", {
        project_id: "group/project",
        since: "2024-01-01",
      });

      const text = result.messages[0].content.text!;
      expect(text).toContain("feature");
      expect(text).toContain("bug");
    });
  });

  describe("error handling", () => {
    it("should propagate API errors", async () => {
      mockClient.get.mockRejectedValue(new Error("API Error"));

      await expect(
        prompts.get("review-mr", {
          project_id: "group/project",
          mr_iid: "42",
        })
      ).rejects.toThrow("API Error");
    });

    it("should handle missing author gracefully", async () => {
      mockClient.get
        .mockResolvedValueOnce({ title: "MR", author: null })
        .mockResolvedValueOnce({ changes: [] })
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({ approved: false, approved_by: [] });

      const result = await prompts.get("review-mr", {
        project_id: "group/project",
        mr_iid: "42",
      });

      expect(result.messages[0].content.text).toContain("Unknown");
    });

    it("should handle missing description gracefully", async () => {
      mockClient.get
        .mockResolvedValueOnce({ title: "MR", author: { name: "Dev" }, description: null })
        .mockResolvedValueOnce({ changes: [] })
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({ approved: false, approved_by: [] });

      const result = await prompts.get("review-mr", {
        project_id: "group/project",
        mr_iid: "42",
      });

      expect(result.messages[0].content.text).toContain("No description provided");
    });
  });
});
