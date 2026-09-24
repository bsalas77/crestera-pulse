# Security policy

Crestera Pulse is a free, self-hosted tool. If you find a security problem in
it, please report it privately so it can be fixed before it is discussed
publicly.

**How to report:** use this repository's **Security** tab → **Report a
vulnerability** (GitHub private vulnerability reporting). Please include what
you found, the steps or a proof of concept to reproduce it, and the version
(commit) you tested. Do not open a public issue for a vulnerability.

You can expect an acknowledgement within a few days. This is a free tool
maintained on a best-effort basis, so fix timelines depend on severity and
complexity, but confirmed vulnerabilities will be prioritised.

**Scope:** the code in this repository and its Docker images. The
deployment around it (your TLS proxy, host, network and backups) is yours to
secure — see the Security and "Serving it to other people" sections of the README
for what the tool does and doesn't do for you.

**Supported versions:** the latest commit on `main`.
