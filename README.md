# Backwindow

Backwindow is a Salesforce login service that allows multiple users to sign in to multiple orgs without sharing any credentials or passwords, using JWT grant.

Backwindow is secure because it does not persistently expose credential information, unlike sharing URL with the Salesforce CLI `force:org:open` command (a.k.a frontdoor.jsp URL).
Only registered users can get login access to the orgs which accept JWT bearer auth.
