# Machina

## Structure

- `@core`: Core library for Machina, containing basic types, workflow primitives, and utilities.
- `@llm`: Library for interacting with coding agents.
- `@cli`: Command-line interface for Machina, allowing users to run workflows and manage agents.
- `@ui`: User interface components for Machina, including a web dashboard for monitoring workflows and agents.

## Workflow

Workflow is a collection of actions that are executed in a specific order. Workflow starts `initStep` step, performs the action defined in the step, and then transitions to the next step based on the defined conditions. These steps would be continued until it reaches special `COMPLETE` or `ABORT` steps.

```yaml
initStep: plan
steps:
  plan:
    action:
      type: claude
      params:
        prompt: |
          以下のタスクの実装計画を立ててください。

          タスク: {{ task.description }}

          計画は簡潔に、具体的なステップを箇条書きで記述してください。
        tools:
          - Read
          - Bash
        model: opus
        effort: high
        outputSchema:
          plan: str
    transitions:
      - next: impl

  impl:
    isolation: worktree
    commitMessage: "feat: implement task"
    action:
      include: ../actions/impl.toml
      overrides:
        effort: medium
    transitions:
      - next: verify

  verify:
    action:
      type: command
      params:
        command: "bun run check && bun test"
        output: feedback
    transitions:
      - cond: "status.code == 'ok'"
        next: review
      - cond: "status.code == 'error'"
        next: impl  # back to impl for fixing issues

  review:
    mutex: true # or str to support mutex
    action: ../actions/review.toml
    transitions:
      - cond: "status.code == 'approved'"
        next: COMPLETE
      - cond: "status.code == 'rejected'"
        next: impl  # back to impl for re-implementation with feedback
    middlewares:
      # If you want to apply middlewares only for specific steps,
      # you can specify them in the step definition.
      # The middleware key should be unique across the workflow.
      reviewLogger:
        type: logger

middlewares:
  logger:
    type: logger
    # Only apply logger middleware to the 'plan' step
    # If not specified, the middleware would be applied to all steps by default
    applyTo:
      - plan
```

## Commands

```bash
# Initialize Machina dotfiles in the current directory
machina init

# Run Machina to execute enqueued tasks
machina run

# Conduct a dry run to see the execution plan without running tasks
machina run --dry-run

# Start Machina in watch mode, automatically starts a new task when enqueued
machina run --watch

# Start Machina local server and WebUI
# WebUI supports task creation, workflow visualization, telemetry monitoring, and more
machina serve --port 8080

# List all tasks
machina task ls

# Initialize a new task file with draft status
machina task new --name "Task Name" --description "Task Description"
# via JSON, for pipelines
machina task new --json '{"name": "Task Name", "description": "Task Description"}'
# Initialize a new task file and enqueue it for execution
machina task new --enqueue --json '{"name": "Task Name", "description": "Task Description"}'

# Enqueue a task for execution
machina task enqueue

# List all workflows
machina workflow ls
```

## Features

- Isolated actions: Each action can be isolated in following environments:
  - `worktree`: Create a git worktree for the action. After the action is completed, changes are automatically committed with the specified commit message, and the worktree is removed.
  - `shared`: Use main repository directory. Actions are queued and executed sequentially to avoid conflicts.
