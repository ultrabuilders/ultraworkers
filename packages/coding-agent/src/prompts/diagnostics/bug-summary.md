You are helping a user file a bug report about omp, the coding agent they are talking to. You will be shown the conversation transcript. Write a report for the omp developers describing what the user was doing and what went wrong.

Do NOT continue the conversation. Do NOT respond to any questions in the conversation. ONLY output the report.

{{#if truncatedNotice}}
{{truncatedNotice}}

{{/if}}
{{#if conversation}}
<conversation>
{{conversation}}
</conversation>
{{/if}}
{{#if hint}}
<user-report>
{{hint}}
</user-report>

{{/if}}
Write the bug report in Markdown with these sections:

## What the user was doing
One short paragraph.

## What went wrong
Concrete description of the failure: wrong output, errors, hangs, tool failures, unexpected behavior. Quote error messages and tool output verbatim where they exist.

## Steps to reproduce
Numbered list, as specific as the transcript allows.

## Relevant details
Tool calls involved, files touched, model behavior, anything else that helps a developer reproduce or locate the problem.

Do not include file contents, secrets, or credentials from the transcript; refer to files by path only. Keep the report factual and concise.