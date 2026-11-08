# Applied Ontology Education · Working Group Directory

A complete GitHub Pages website for the ontology engineering community. Eleven initial groups, six focus areas, instant search, participation filters, source-linked details, contact links, and a submission form that opens a review pull request through GitHub Actions.

## Publish by dragging and dropping

1. **Create a public repository inside the Applied Ontology Education GitHub organization**, preferably called `working-groups`. Select the actual organization from GitHub's Owner menu. Use `main` as the default branch and initialize with a README. Keep Issues enabled. A public repository allows public submissions and GitHub Pages on GitHub Free for organizations. 
2. **Unzip this package.** Open the `working-groups` folder. On a Mac, press **Command + Shift + period** to reveal hidden files. On Windows, enable **View → Show → Hidden items**. You must see **`.github`**: it contains the automation.
3. In the repository choose **Add file → Upload files**. **Drag the contents of `working-groups`, including `.github`, into the repository root. Do not upload the ZIP or the outer folder.** Commit the files to `main`. If a README already exists, this package's README can replace it. GitHub's web uploader can handle this package's file count and sizes.
4. Under **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. Do not choose “Deploy from a branch.”
5. Under **Settings → Actions → General → Workflow permissions**, enable **Allow GitHub Actions to create and approve pull requests**, then Save. The workflows explicitly request only their necessary permissions; they never approve or merge a PR. Organization policy may require an organization owner to enable this setting. No personal access token or repository secret is required.
6. Open **Actions → Publish directory → Run workflow → main → Run workflow**. The upload's first automatic deployment may have failed before Pages was enabled; this manual run fixes that. After the run succeeds, **Settings → Pages** displays the live URL.

## What happens when a visitor submits a group?

1. The visitor completes **Add a group** on the directory and chooses **Continue on GitHub**.
2. GitHub opens an issue with their details filled in. The visitor signs into a free GitHub account if needed and selects **Submit new issue**. **The site does not submit anything until this GitHub confirmation.** A single-step anonymous submission would need a separate service and abuse controls; this package intentionally requires only GitHub.
3. The **Working group submission** workflow validates the information, commits one new JSON file to a proposal branch, opens a pull request, and replies to the issue with its link.
4. A maintainer reviews the listing and merges the PR. GitHub Pages rebuilds and publishes it automatically.

Visitors can also use **Issues → New issue → Add a working group** to fill out a native GitHub form. Both forms use the same validation and PR workflow. The on-page form supports up to five contacts; the native GitHub form collects one contact.

No visitor receives write access. Public text is treated as data, not code. The workflow checks out trusted default-branch code; it never executes a submitter's branch or issue content. Proposal branches and filenames are generated from the numeric GitHub issue ID. No submissions are automatically merged.
