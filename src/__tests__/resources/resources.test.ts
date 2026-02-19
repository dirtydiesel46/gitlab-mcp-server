import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitLabResources } from "../../resources/index.js";
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

describe("GitLabResources", () => {
  let resources: GitLabResources;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    resources = new GitLabResources(mockClient as unknown as GitLabClient);
    vi.clearAllMocks();
  });

  describe("getTemplates", () => {
    it("should return all resource templates", () => {
      const templates = resources.getTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);

      // Verify expected templates exist
      const templateNames = templates.map((t) => t.name);
      expect(templateNames).toContain("GitLab Project");
      expect(templateNames).toContain("Merge Request");
      expect(templateNames).toContain("Merge Request Diffs");
      expect(templateNames).toContain("Merge Request Discussions");
      expect(templateNames).toContain("Merge Request Approvals");
      expect(templateNames).toContain("Issue");
      expect(templateNames).toContain("Pipeline");
      expect(templateNames).toContain("Pipeline Jobs");
      expect(templateNames).toContain("Job Trace");
    });

    it("should have correct structure for each template", () => {
      const templates = resources.getTemplates();

      templates.forEach((template) => {
        expect(template).toHaveProperty("uriTemplate");
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("mimeType");
        expect(template.uriTemplate).toMatch(/^gitlab:\/\//);
      });
    });
  });

  describe("getStaticResources", () => {
    it("should return current user resource", () => {
      const staticResources = resources.getStaticResources();

      expect(staticResources).toHaveLength(1);
      expect(staticResources[0]).toEqual({
        uri: "gitlab://user/me",
        name: "Current User",
        description: "The currently authenticated GitLab user",
        mimeType: "application/json",
      });
    });
  });

  describe("parseUri", () => {
    describe("user/me resource", () => {
      it("should parse gitlab://user/me", () => {
        const result = resources.parseUri("gitlab://user/me");
        expect(result).toEqual({ type: "user/me", params: {} });
      });
    });

    describe("project resources", () => {
      it("should parse simple project ID", () => {
        const result = resources.parseUri("gitlab://project/12345");
        expect(result).toEqual({
          type: "project",
          params: { project_id: "12345" },
        });
      });

      it("should parse URL-encoded project path (group/project)", () => {
        const result = resources.parseUri(
          "gitlab://project/group%2Fproject"
        );
        expect(result).toEqual({
          type: "project",
          params: { project_id: "group/project" },
        });
      });

      it("should parse URL-encoded nested project path (group/subgroup/project)", () => {
        const result = resources.parseUri(
          "gitlab://project/group%2Fsubgroup%2Fproject"
        );
        expect(result).toEqual({
          type: "project",
          params: { project_id: "group/subgroup/project" },
        });
      });

      it("should parse project labels", () => {
        const result = resources.parseUri(
          "gitlab://project/group%2Fproject/labels"
        );
        expect(result).toEqual({
          type: "project/labels",
          params: { project_id: "group/project" },
        });
      });

      it("should parse project branches", () => {
        const result = resources.parseUri(
          "gitlab://project/group%2Fproject/branches"
        );
        expect(result).toEqual({
          type: "project/branches",
          params: { project_id: "group/project" },
        });
      });
    });

    describe("merge request resources", () => {
      it("should parse MR with numeric project ID", () => {
        const result = resources.parseUri("gitlab://mr/12345/42");
        expect(result).toEqual({
          type: "mr",
          params: { project_id: "12345", iid: "42" },
        });
      });

      it("should parse MR with URL-encoded project path", () => {
        const result = resources.parseUri(
          "gitlab://mr/group%2Fproject/42"
        );
        expect(result).toEqual({
          type: "mr",
          params: { project_id: "group/project", iid: "42" },
        });
      });

      it("should parse MR diffs", () => {
        const result = resources.parseUri(
          "gitlab://mr/group%2Fproject/42/diffs"
        );
        expect(result).toEqual({
          type: "mr/diffs",
          params: { project_id: "group/project", iid: "42" },
        });
      });

      it("should parse MR discussions", () => {
        const result = resources.parseUri(
          "gitlab://mr/group%2Fproject/42/discussions"
        );
        expect(result).toEqual({
          type: "mr/discussions",
          params: { project_id: "group/project", iid: "42" },
        });
      });

      it("should parse MR approvals", () => {
        const result = resources.parseUri(
          "gitlab://mr/group%2Fproject/42/approvals"
        );
        expect(result).toEqual({
          type: "mr/approvals",
          params: { project_id: "group/project", iid: "42" },
        });
      });
    });

    describe("issue resources", () => {
      it("should parse issue with URL-encoded project path", () => {
        const result = resources.parseUri(
          "gitlab://issue/group%2Fproject/123"
        );
        expect(result).toEqual({
          type: "issue",
          params: { project_id: "group/project", iid: "123" },
        });
      });
    });

    describe("pipeline resources", () => {
      it("should parse pipeline", () => {
        const result = resources.parseUri(
          "gitlab://pipeline/group%2Fproject/456"
        );
        expect(result).toEqual({
          type: "pipeline",
          params: { project_id: "group/project", id: "456" },
        });
      });

      it("should parse pipeline jobs", () => {
        const result = resources.parseUri(
          "gitlab://pipeline/group%2Fproject/456/jobs"
        );
        expect(result).toEqual({
          type: "pipeline/jobs",
          params: { project_id: "group/project", id: "456" },
        });
      });
    });

    describe("job resources", () => {
      it("should parse job trace", () => {
        const result = resources.parseUri(
          "gitlab://job/group%2Fproject/789/trace"
        );
        expect(result).toEqual({
          type: "job/trace",
          params: { project_id: "group/project", id: "789" },
        });
      });
    });

    describe("invalid URIs", () => {
      it("should return null for non-gitlab protocol", () => {
        const result = resources.parseUri("https://gitlab.com/project/123");
        expect(result).toBeNull();
      });

      it("should return null for invalid URI format", () => {
        const result = resources.parseUri("not-a-valid-uri");
        expect(result).toBeNull();
      });

      it("should return null for unknown resource type", () => {
        const result = resources.parseUri("gitlab://unknown/123");
        expect(result).toBeNull();
      });

      it("should return null for empty project path", () => {
        const result = resources.parseUri("gitlab://project/");
        expect(result).toBeNull();
      });
    });
  });

  describe("read", () => {
    describe("user/me resource", () => {
      it("should fetch current user", async () => {
        const mockUser = { id: 1, username: "testuser", name: "Test User" };
        mockClient.get.mockResolvedValue(mockUser);

        const result = await resources.read("gitlab://user/me");

        expect(mockClient.get).toHaveBeenCalledWith("/user");
        expect(result).toEqual({
          uri: "gitlab://user/me",
          mimeType: "application/json",
          text: JSON.stringify(mockUser, null, 2),
        });
      });
    });

    describe("project resources", () => {
      it("should fetch project details", async () => {
        const mockProject = { id: 123, name: "Test Project" };
        mockClient.get.mockResolvedValue(mockProject);

        const result = await resources.read(
          "gitlab://project/group%2Fproject"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject"
        );
        expect(result.mimeType).toBe("application/json");
        expect(JSON.parse(result.text)).toEqual(mockProject);
      });

      it("should fetch project labels", async () => {
        const mockLabels = [{ id: 1, name: "bug" }, { id: 2, name: "feature" }];
        mockClient.get.mockResolvedValue(mockLabels);

        const result = await resources.read(
          "gitlab://project/group%2Fproject/labels"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/labels"
        );
        expect(JSON.parse(result.text)).toEqual(mockLabels);
      });

      it("should fetch project branches", async () => {
        const mockBranches = [{ name: "main" }, { name: "develop" }];
        mockClient.get.mockResolvedValue(mockBranches);

        const result = await resources.read(
          "gitlab://project/group%2Fproject/branches"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/repository/branches"
        );
        expect(JSON.parse(result.text)).toEqual(mockBranches);
      });
    });

    describe("merge request resources", () => {
      it("should fetch merge request", async () => {
        const mockMR = { iid: 42, title: "Test MR" };
        mockClient.get.mockResolvedValue(mockMR);

        const result = await resources.read(
          "gitlab://mr/group%2Fproject/42"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/merge_requests/42"
        );
        expect(JSON.parse(result.text)).toEqual(mockMR);
      });

      it("should fetch merge request diffs", async () => {
        const mockDiffs = { changes: [{ new_path: "file.ts" }] };
        mockClient.get.mockResolvedValue(mockDiffs);

        const result = await resources.read(
          "gitlab://mr/group%2Fproject/42/diffs"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/merge_requests/42/changes"
        );
        expect(JSON.parse(result.text)).toEqual(mockDiffs);
      });

      it("should fetch merge request discussions", async () => {
        const mockDiscussions = [{ id: "abc", notes: [] }];
        mockClient.get.mockResolvedValue(mockDiscussions);

        const result = await resources.read(
          "gitlab://mr/group%2Fproject/42/discussions"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/merge_requests/42/discussions"
        );
        expect(JSON.parse(result.text)).toEqual(mockDiscussions);
      });

      it("should fetch merge request approvals", async () => {
        const mockApprovals = { approved: true, approved_by: [] };
        mockClient.get.mockResolvedValue(mockApprovals);

        const result = await resources.read(
          "gitlab://mr/group%2Fproject/42/approvals"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/merge_requests/42/approvals"
        );
        expect(JSON.parse(result.text)).toEqual(mockApprovals);
      });
    });

    describe("issue resources", () => {
      it("should fetch issue", async () => {
        const mockIssue = { iid: 123, title: "Test Issue" };
        mockClient.get.mockResolvedValue(mockIssue);

        const result = await resources.read(
          "gitlab://issue/group%2Fproject/123"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/issues/123"
        );
        expect(JSON.parse(result.text)).toEqual(mockIssue);
      });
    });

    describe("pipeline resources", () => {
      it("should fetch pipeline", async () => {
        const mockPipeline = { id: 456, status: "success" };
        mockClient.get.mockResolvedValue(mockPipeline);

        const result = await resources.read(
          "gitlab://pipeline/group%2Fproject/456"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/pipelines/456"
        );
        expect(JSON.parse(result.text)).toEqual(mockPipeline);
      });

      it("should fetch pipeline jobs", async () => {
        const mockJobs = [{ id: 1, name: "build" }];
        mockClient.get.mockResolvedValue(mockJobs);

        const result = await resources.read(
          "gitlab://pipeline/group%2Fproject/456/jobs"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/pipelines/456/jobs"
        );
        expect(JSON.parse(result.text)).toEqual(mockJobs);
      });
    });

    describe("job resources", () => {
      it("should fetch job trace as plain text", async () => {
        const mockTrace = "Build starting...\nBuild complete.";
        mockClient.get.mockResolvedValue(mockTrace);

        const result = await resources.read(
          "gitlab://job/group%2Fproject/789/trace"
        );

        expect(mockClient.get).toHaveBeenCalledWith(
          "/projects/group%2Fproject/jobs/789/trace"
        );
        expect(result).toEqual({
          uri: "gitlab://job/group%2Fproject/789/trace",
          mimeType: "text/plain",
          text: mockTrace,
        });
      });
    });

    describe("error handling", () => {
      it("should throw error for invalid URI", async () => {
        await expect(
          resources.read("https://invalid-uri.com")
        ).rejects.toThrow("Invalid GitLab resource URI");
      });

      it("should throw error for unknown resource type", async () => {
        await expect(
          resources.read("gitlab://unknown/123")
        ).rejects.toThrow("Invalid GitLab resource URI");
      });

      it("should propagate API errors", async () => {
        mockClient.get.mockRejectedValue(new Error("API Error"));

        await expect(
          resources.read("gitlab://user/me")
        ).rejects.toThrow("API Error");
      });
    });
  });
});
