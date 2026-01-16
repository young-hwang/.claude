---
description: Send a message (command) to a specific tmux session
category: tmux-utility
argument-hint: <session-name> "<message>"
allowed-tools: Bash(tmux *)
---

# Send Message to tmux Session

This command sends a message or a command string to a running tmux session.

## Command Usage

Provide the target tmux session name and the message to send: $ARGUMENTS

## Workflow

1. **Parse Arguments**
   - The first argument is the target tmux session name.
   - The second argument is the message string to be sent.

2. **Execute Send Command Script**
   - Executes `~/.claude/scripts/tmux-send-command.sh` with the session name and message.
   - The script will verify tmux installation and session existence.
   - It sends the message and simulates pressing 'Enter'.

3. **Confirmation**
   - The script will output a confirmation message once the command is sent.

## Notes

- This command is a wrapper around the `~/.claude/scripts/tmux-send-command.sh` script.
- The script requires two arguments: `<session-name>` and `<command>`.
- The message/command will be sent to the session as if it were typed, followed by the Enter key.
- The script will provide an error if tmux is not installed or if the target session does not exist.

## Example Usage

To send the `ls -l` command to a tmux session named `dev-session`:

```bash
@send-message dev-session "ls -l"
```

The underlying script execution would be:

```bash
~/.claude/scripts/tmux-send-command.sh "dev-session" "ls -l"
```
