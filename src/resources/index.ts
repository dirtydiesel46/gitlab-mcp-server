import type { GitLabClient } from "../client.js";

/**
 * Resource URI schemes for GitLab MCP Server
 *
 * gitlab://user/me - Current user
 * gitlab://project/{project_id} - Project details
 * gitlab://project/{project_id}/labels - Project labels
 * gitlab://project/{project_id}/branches - Project branches
 * gitlab://mr/{project_id}/{iid} - Merge request
 * gitlab://mr/{project_id}/{iid}/diffs - MR diffs
 * gitlab://mr/{project_id}/{iid}/discussions - MR discussions
 * gitlab://mr/{project_id}/{iid}/approvals - MR approvals
 * gitlab://issue/{project_id}/{iid} - Issue
 * gitlab://pipeline/{project_id}/{id} - Pipeline
 * gitlab://pipeline/{project_id}/{id}/jobs - Pipeline jobs
 * gitlab://job/{project_id}/{id}/trace - Job trace/logs
 */

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
}

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType: string;
}

export class GitLabResources {
  constructor(private client: GitLabClient) {}

  /**
   * Get resource templates (parameterized resources)
   */
  getTemplates(): ResourceTemplate[] {
    return [
      {
        uriTemplate: "gitlab://project/{project_id}",
        name: "GitLab Project",
        description: "Get details of a GitLab project",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://project/{project_id}/labels",
        name: "Project Labels",
        description: "List all labels in a project",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://project/{project_id}/branches",
        name: "Project Branches",
        description: "List all branches in a project",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://mr/{project_id}/{iid}",
        name: "Merge Request",
        description: "Get details of a merge request",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://mr/{project_id}/{iid}/diffs",
        name: "Merge Request Diffs",
        description: "Get the diffs/changes of a merge request",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://mr/{project_id}/{iid}/discussions",
        name: "Merge Request Discussions",
        description: "Get all discussions on a merge request",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://mr/{project_id}/{iid}/approvals",
        name: "Merge Request Approvals",
        description: "Get approval status of a merge request",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://issue/{project_id}/{iid}",
        name: "Issue",
        description: "Get details of an issue",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://pipeline/{project_id}/{id}",
        name: "Pipeline",
        description: "Get details of a pipeline",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://pipeline/{project_id}/{id}/jobs",
        name: "Pipeline Jobs",
        description: "Get jobs of a pipeline",
        mimeType: "application/json",
      },
      {
        uriTemplate: "gitlab://job/{project_id}/{id}/trace",
        name: "Job Trace",
        description: "Get the log output of a job",
        mimeType: "text/plain",
      },
    ];
  }

  /**
   * Get static resources (always available)
   */
  getStaticResources(): ResourceDefinition[] {
    return [
      {
        uri: "gitlab://user/me",
        name: "Current User",
        description: "The currently authenticated GitLab user",
        mimeType: "application/json",
      },
    ];
  }

  /**
   * Parse a GitLab resource URI and extract components
   *
   * Handles URL-encoded project IDs (e.g., group%2Fsubgroup%2Fproject)
   *
   * URI Format: gitlab://{resource_type}/{project_id}[/{sub_id}[/{action}]]
   *
   * Examples:
   * - gitlab://user/me
   * - gitlab://project/group%2Fproject
   * - gitlab://mr/group%2Fproject/123/diffs
   */
  parseUri(uri: string): { type: string; params: Record<string, string> } | null {
    let url: URL;
    try {
      url = new URL(uri);
    } catch {
      return null;
    }

    if (url.protocol !== "gitlab:") {
      return null;
    }

    // Get the host and pathname - URL parsing handles gitlab://host/path
    // For gitlab://user/me, host="user", pathname="/me"
    // For gitlab://project/group%2Fproject, host="project", pathname="/group%2Fproject"
    const resourceType = url.host;
    const pathParts = url.pathname.replace(/^\//, "").split("/");

    // Decode the first path part as it may contain the encoded project_id
    const firstPart = pathParts[0] ? decodeURIComponent(pathParts[0]) : "";
    const secondPart = pathParts[1] || "";
    const thirdPart = pathParts[2] || "";

    // gitlab://user/me
    if (resourceType === "user" && firstPart === "me") {
      return { type: "user/me", params: {} };
    }

    // gitlab://project/{project_id}
    if (resourceType === "project" && firstPart && !secondPart) {
      return { type: "project", params: { project_id: firstPart } };
    }

    // gitlab://project/{project_id}/labels
    if (resourceType === "project" && secondPart === "labels") {
      return { type: "project/labels", params: { project_id: firstPart } };
    }

    // gitlab://project/{project_id}/branches
    if (resourceType === "project" && secondPart === "branches") {
      return { type: "project/branches", params: { project_id: firstPart } };
    }

    // gitlab://mr/{project_id}/{iid}
    if (resourceType === "mr" && firstPart && secondPart && !thirdPart) {
      return { type: "mr", params: { project_id: firstPart, iid: secondPart } };
    }

    // gitlab://mr/{project_id}/{iid}/diffs
    if (resourceType === "mr" && thirdPart === "diffs") {
      return { type: "mr/diffs", params: { project_id: firstPart, iid: secondPart } };
    }

    // gitlab://mr/{project_id}/{iid}/discussions
    if (resourceType === "mr" && thirdPart === "discussions") {
      return { type: "mr/discussions", params: { project_id: firstPart, iid: secondPart } };
    }

    // gitlab://mr/{project_id}/{iid}/approvals
    if (resourceType === "mr" && thirdPart === "approvals") {
      return { type: "mr/approvals", params: { project_id: firstPart, iid: secondPart } };
    }

    // gitlab://issue/{project_id}/{iid}
    if (resourceType === "issue" && firstPart && secondPart && !thirdPart) {
      return { type: "issue", params: { project_id: firstPart, iid: secondPart } };
    }

    // gitlab://pipeline/{project_id}/{id}
    if (resourceType === "pipeline" && firstPart && secondPart && !thirdPart) {
      return { type: "pipeline", params: { project_id: firstPart, id: secondPart } };
    }

    // gitlab://pipeline/{project_id}/{id}/jobs
    if (resourceType === "pipeline" && thirdPart === "jobs") {
      return { type: "pipeline/jobs", params: { project_id: firstPart, id: secondPart } };
    }

    // gitlab://job/{project_id}/{id}/trace
    if (resourceType === "job" && thirdPart === "trace") {
      return { type: "job/trace", params: { project_id: firstPart, id: secondPart } };
    }

    return null;
  }

  /**
   * Read a resource by URI
   */
  async read(uri: string): Promise<{ uri: string; mimeType: string; text: string }> {
    const parsed = this.parseUri(uri);

    if (!parsed) {
      throw new Error(`Invalid GitLab resource URI: ${uri}`);
    }

    const { type, params } = parsed;
    let data: unknown;
    let mimeType = "application/json";

    switch (type) {
      case "user/me":
        data = await this.client.get("/user");
        break;

      case "project":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}`
        );
        break;

      case "project/labels":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/labels`
        );
        break;

      case "project/branches":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/repository/branches`
        );
        break;

      case "mr":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/merge_requests/${params.iid}`
        );
        break;

      case "mr/diffs":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/merge_requests/${params.iid}/changes`
        );
        break;

      case "mr/discussions":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/merge_requests/${params.iid}/discussions`
        );
        break;

      case "mr/approvals":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/merge_requests/${params.iid}/approvals`
        );
        break;

      case "issue":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/issues/${params.iid}`
        );
        break;

      case "pipeline":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/pipelines/${params.id}`
        );
        break;

      case "pipeline/jobs":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/pipelines/${params.id}/jobs`
        );
        break;

      case "job/trace":
        data = await this.client.get(
          `/projects/${encodeURIComponent(params.project_id)}/jobs/${params.id}/trace`
        );
        mimeType = "text/plain";
        // Job trace returns plain text, not JSON
        return { uri, mimeType, text: String(data) };

      default:
        throw new Error(`Unknown resource type: ${type}`);
    }

    return {
      uri,
      mimeType,
      text: JSON.stringify(data, null, 2),
    };
  }
}
