import type { GitLabClient } from "../client.js";

/**
 * Prompt definitions for GitLab MCP Server
 *
 * These prompts provide structured workflows for common GitLab tasks.
 */

export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: {
    type: "text" | "resource";
    text?: string;
    resource?: {
      uri: string;
      mimeType: string;
      text: string;
    };
  };
}

export interface PromptResult {
  description: string;
  messages: PromptMessage[];
}

export class GitLabPrompts {
  constructor(private client: GitLabClient) {}

  /**
   * Get all available prompts
   */
  list(): PromptDefinition[] {
    return [
      {
        name: "review-mr",
        description:
          "Review a merge request with full context including diffs, discussions, and approval status. Provides a structured analysis template.",
        arguments: [
          {
            name: "project_id",
            description: "Project ID or path (e.g., 'group/project')",
            required: true,
          },
          {
            name: "mr_iid",
            description: "Merge request internal ID",
            required: true,
          },
        ],
      },
      {
        name: "analyze-pipeline-failure",
        description:
          "Analyze a failed pipeline by examining job logs and identifying the root cause of failure.",
        arguments: [
          {
            name: "project_id",
            description: "Project ID or path",
            required: true,
          },
          {
            name: "pipeline_id",
            description: "Pipeline ID",
            required: true,
          },
        ],
      },
      {
        name: "summarize-mr-changes",
        description:
          "Generate a summary of all changes in a merge request, suitable for release notes or team updates.",
        arguments: [
          {
            name: "project_id",
            description: "Project ID or path",
            required: true,
          },
          {
            name: "mr_iid",
            description: "Merge request internal ID",
            required: true,
          },
        ],
      },
      {
        name: "check-mr-readiness",
        description:
          "Check if a merge request is ready to be merged by verifying approvals, resolved discussions, and pipeline status.",
        arguments: [
          {
            name: "project_id",
            description: "Project ID or path",
            required: true,
          },
          {
            name: "mr_iid",
            description: "Merge request internal ID",
            required: true,
          },
        ],
      },
      {
        name: "generate-release-notes",
        description:
          "Generate release notes from merged merge requests in a project since a given date or tag.",
        arguments: [
          {
            name: "project_id",
            description: "Project ID or path",
            required: true,
          },
          {
            name: "since",
            description: "Start date (ISO format) or tag name to generate notes from",
            required: true,
          },
        ],
      },
    ];
  }

  /**
   * Validate that required arguments are present
   */
  private validateArgs(
    args: Record<string, string>,
    required: string[],
    promptName: string
  ): void {
    const missing = required.filter(
      (arg) => !args[arg] || args[arg].trim() === ""
    );
    if (missing.length > 0) {
      throw new Error(
        `Missing required arguments for prompt '${promptName}': ${missing.join(", ")}`
      );
    }
  }

  /**
   * Get a specific prompt with arguments filled in
   */
  async get(
    name: string,
    args: Record<string, string>
  ): Promise<PromptResult> {
    switch (name) {
      case "review-mr":
        this.validateArgs(args, ["project_id", "mr_iid"], name);
        return this.getReviewMRPrompt(args.project_id, args.mr_iid);

      case "analyze-pipeline-failure":
        this.validateArgs(args, ["project_id", "pipeline_id"], name);
        return this.getAnalyzePipelinePrompt(args.project_id, args.pipeline_id);

      case "summarize-mr-changes":
        this.validateArgs(args, ["project_id", "mr_iid"], name);
        return this.getSummarizeMRPrompt(args.project_id, args.mr_iid);

      case "check-mr-readiness":
        this.validateArgs(args, ["project_id", "mr_iid"], name);
        return this.getCheckMRReadinessPrompt(args.project_id, args.mr_iid);

      case "generate-release-notes":
        this.validateArgs(args, ["project_id", "since"], name);
        return this.getGenerateReleaseNotesPrompt(args.project_id, args.since);

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  private async getReviewMRPrompt(
    projectId: string,
    mrIid: string
  ): Promise<PromptResult> {
    const [mr, diffs, discussions, approvals] = await Promise.all([
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`
      ),
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/changes`
      ),
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/discussions`
      ),
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/approvals`
      ),
    ]);

    return {
      description: `Code review for MR !${mrIid}: ${mr.title}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please review this merge request and provide feedback.

## Merge Request Details
- **Title:** ${mr.title}
- **Author:** ${mr.author?.name || "Unknown"}
- **Source Branch:** ${mr.source_branch} → **Target:** ${mr.target_branch}
- **State:** ${mr.state}
- **URL:** ${mr.web_url}

## Description
${mr.description || "(No description provided)"}

## Approval Status
- **Approved:** ${approvals.approved ? "Yes" : "No"}
- **Approvals Required:** ${approvals.approvals_required}
- **Approvers:** ${approvals.approved_by?.map((a: { user: { name: string } }) => a.user.name).join(", ") || "None"}

## Changes (${diffs.changes?.length || 0} files)
\`\`\`
${JSON.stringify(diffs.changes?.map((c: { new_path: string; diff: string }) => ({ file: c.new_path, diff: c.diff?.substring(0, 500) })), null, 2)}
\`\`\`

## Discussions (${discussions.length} threads)
${discussions
  .filter((d: { notes: Array<{ body: string }> }) => d.notes?.length > 0)
  .slice(0, 5)
  .map(
    (d: { notes: Array<{ body: string; author: { name: string }; resolved?: boolean }> }) =>
      `- ${d.notes[0].author?.name}: "${d.notes[0].body?.substring(0, 100)}..." ${d.notes[0].resolved ? "(resolved)" : ""}`
  )
  .join("\n")}

---

Please provide:
1. **Overall Assessment** - Is this MR ready to merge?
2. **Code Quality** - Any issues with the implementation?
3. **Potential Bugs** - Any edge cases or bugs you notice?
4. **Suggestions** - Improvements or alternative approaches?
5. **Security Concerns** - Any security issues?`,
          },
        },
      ],
    };
  }

  private async getAnalyzePipelinePrompt(
    projectId: string,
    pipelineId: string
  ): Promise<PromptResult> {
    const [pipeline, jobs] = await Promise.all([
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}`
      ),
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/jobs`
      ),
    ]);

    // Find failed jobs and get their traces
    const failedJobs = jobs.filter((j: { status: string }) => j.status === "failed");
    const jobTraces: Array<{ name: string; trace: string }> = [];

    for (const job of failedJobs.slice(0, 3)) {
      // Limit to 3 failed jobs
      try {
        const trace = await this.client.get(
          `/projects/${encodeURIComponent(projectId)}/jobs/${job.id}/trace`
        );
        // Get last 100 lines of trace
        const lines = String(trace).split("\n");
        jobTraces.push({
          name: job.name,
          trace: lines.slice(-100).join("\n"),
        });
      } catch {
        jobTraces.push({ name: job.name, trace: "(Unable to fetch trace)" });
      }
    }

    return {
      description: `Pipeline failure analysis for #${pipelineId}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze this failed pipeline and help identify the root cause.

## Pipeline Details
- **ID:** ${pipeline.id}
- **Status:** ${pipeline.status}
- **Ref:** ${pipeline.ref}
- **SHA:** ${pipeline.sha}
- **URL:** ${pipeline.web_url}
- **Created:** ${pipeline.created_at}

## Jobs Summary
| Job | Stage | Status | Duration |
|-----|-------|--------|----------|
${jobs
  .map(
    (j: { name: string; stage: string; status: string; duration: number }) =>
      `| ${j.name} | ${j.stage} | ${j.status} | ${j.duration || "-"}s |`
  )
  .join("\n")}

## Failed Job Logs
${jobTraces
  .map(
    (jt) => `### ${jt.name}
\`\`\`
${jt.trace}
\`\`\``
  )
  .join("\n\n")}

---

Please provide:
1. **Root Cause** - What caused the pipeline to fail?
2. **Error Analysis** - Explain the error messages
3. **Fix Suggestions** - How to fix the issue?
4. **Prevention** - How to prevent this in the future?`,
          },
        },
      ],
    };
  }

  private async getSummarizeMRPrompt(
    projectId: string,
    mrIid: string
  ): Promise<PromptResult> {
    const [mr, diffs, commits] = await Promise.all([
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`
      ),
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/changes`
      ),
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/commits`
      ),
    ]);

    return {
      description: `Summary for MR !${mrIid}: ${mr.title}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please generate a concise summary of this merge request suitable for release notes or team updates.

## Merge Request
- **Title:** ${mr.title}
- **Author:** ${mr.author?.name}
- **Labels:** ${mr.labels?.join(", ") || "None"}

## Description
${mr.description || "(No description)"}

## Commits (${commits.length})
${commits
  .map((c: { short_id: string; title: string }) => `- ${c.short_id}: ${c.title}`)
  .join("\n")}

## Files Changed (${diffs.changes?.length || 0})
${diffs.changes
  ?.map((c: { new_path: string; new_file: boolean; deleted_file: boolean; renamed_file: boolean }) => {
    const action = c.new_file ? "Added" : c.deleted_file ? "Deleted" : c.renamed_file ? "Renamed" : "Modified";
    return `- [${action}] ${c.new_path}`;
  })
  .join("\n")}

---

Please provide:
1. **One-line Summary** - A brief description for changelogs
2. **Key Changes** - Bullet points of main changes
3. **Impact** - What areas of the codebase are affected?
4. **Breaking Changes** - Any breaking changes to note?`,
          },
        },
      ],
    };
  }

  private async getCheckMRReadinessPrompt(
    projectId: string,
    mrIid: string
  ): Promise<PromptResult> {
    const [mr, discussions, approvals] = await Promise.all([
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`
      ),
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/discussions`
      ),
      this.client.get(
        `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/approvals`
      ),
    ]);

    // Check for unresolved discussions
    const unresolvedDiscussions = discussions.filter(
      (d: { notes: Array<{ resolvable: boolean; resolved: boolean }> }) =>
        d.notes?.some((n) => n.resolvable && !n.resolved)
    );

    // Get pipeline status if available
    let pipelineStatus = "Unknown";
    if (mr.head_pipeline) {
      pipelineStatus = mr.head_pipeline.status;
    }

    return {
      description: `Readiness check for MR !${mrIid}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please check if this merge request is ready to be merged.

## Merge Request
- **Title:** ${mr.title}
- **State:** ${mr.state}
- **Draft:** ${mr.draft ? "Yes" : "No"}
- **Has Conflicts:** ${mr.has_conflicts ? "Yes" : "No"}

## Checklist

### Approvals
- **Required:** ${approvals.approvals_required}
- **Current:** ${approvals.approved_by?.length || 0}
- **Approved:** ${approvals.approved ? "✅ Yes" : "❌ No"}
- **Approvers:** ${approvals.approved_by?.map((a: { user: { name: string } }) => a.user.name).join(", ") || "None"}

### Discussions
- **Total Threads:** ${discussions.length}
- **Unresolved:** ${unresolvedDiscussions.length}
- **Status:** ${unresolvedDiscussions.length === 0 ? "✅ All resolved" : "❌ Has unresolved discussions"}

### Pipeline
- **Status:** ${pipelineStatus}
- **Ready:** ${pipelineStatus === "success" ? "✅ Passed" : pipelineStatus === "running" ? "⏳ Running" : "❌ " + pipelineStatus}

### Merge Conflicts
- **Status:** ${mr.has_conflicts ? "❌ Has conflicts" : "✅ No conflicts"}

---

Please provide:
1. **Ready to Merge?** - Yes/No with reasoning
2. **Blockers** - What needs to be addressed before merging?
3. **Recommendations** - Any suggestions before merging?`,
          },
        },
      ],
    };
  }

  private async getGenerateReleaseNotesPrompt(
    projectId: string,
    since: string
  ): Promise<PromptResult> {
    // Get merged MRs since the given date/tag
    const mrs = await this.client.get(
      `/projects/${encodeURIComponent(projectId)}/merge_requests?state=merged&updated_after=${encodeURIComponent(since)}&per_page=50`
    );

    return {
      description: `Release notes since ${since}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please generate release notes from these merged merge requests.

## Merged MRs since ${since}

${mrs
  .map(
    (mr: { iid: number; title: string; author: { name: string }; labels: string[]; description: string; merged_at: string }) => `### !${mr.iid}: ${mr.title}
- **Author:** ${mr.author?.name}
- **Labels:** ${mr.labels?.join(", ") || "None"}
- **Merged:** ${mr.merged_at}
- **Description:** ${mr.description?.substring(0, 200) || "(none)"}
`
  )
  .join("\n")}

---

Please generate release notes with:
1. **Version Summary** - Brief overview of this release
2. **New Features** - New functionality added
3. **Improvements** - Enhancements to existing features
4. **Bug Fixes** - Issues that were resolved
5. **Breaking Changes** - Any breaking changes
6. **Contributors** - People who contributed`,
          },
        },
      ],
    };
  }
}
