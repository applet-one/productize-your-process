import { el, add, icon } from "../dom.js";
import { state } from "../state.js";
import { postComment, deleteComment } from "../api.js";

// The panel starts below the page header. Fit to the space actually left
// in the viewport, including as its sticky position changes while scrolling.
let fitFrame;
function schedulePanelFit() {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(() => {
    const panel = document.querySelector("#opportunity-comments");
    if (!panel) return;
    const top = Math.max(24, panel.getBoundingClientRect().top);
    panel.style.setProperty("--comments-top", `${top}px`);
  });
}
window.addEventListener("resize", schedulePanelFit);
window.addEventListener("scroll", schedulePanelFit, { passive: true });

export function renderComments(panel, clusterId, title) {
  schedulePanelFit();
  panel.replaceChildren();
  const run = state.run;
  const uploadedAt = state.uploadedAt;
  const key = JSON.stringify([run, clusterId]);
  if (!state.commentDrafts.has(key))
    state.commentDrafts.set(key, { body: "", pending: false, error: "" });
  const draft = state.commentDrafts.get(key);
  draft.deleting ||= new Set();
  const isCurrent = () =>
    state.view === "opportunities" &&
    state.run === run &&
    state.selectedOpportunity[run] === clusterId &&
    state.uploadedAt === uploadedAt;
  const comments = state.comments.filter(
    (c) => c.run_id === run && c.cluster_id === clusterId,
  );
  const heading = el("h2", "comments-heading", `Comments · ${comments.length}`);
  heading.id = "comments-heading";
  panel.setAttribute("aria-labelledby", heading.id);
  add(panel, heading, el("p", "comments-target", title));
  const list = el("div", "comments-list");
  if (!comments.length)
    add(list, el("p", "small muted", "No comments yet. Start the discussion."));
  for (const comment of comments) {
    const time = el(
      "time",
      "small muted",
      new Date(comment.created_at).toLocaleString(),
    );
    time.dateTime = comment.created_at;
    const remove = el(
      "button",
      "comment-delete",
      draft.deleting.has(comment.id) ? "Deleting…" : "Delete",
    );
    remove.type = "button";
    remove.setAttribute("aria-label", "Delete comment");
    remove.disabled = draft.deleting.has(comment.id) || state.loading;
    remove.addEventListener("click", async () => {
      if (draft.deleting.has(comment.id) || state.loading) return;
      draft.deleting.add(comment.id);
      draft.error = "";
      remove.disabled = true;
      remove.textContent = "Deleting…";
      try {
        const id = await deleteComment({ id: comment.id, uploadedAt });
        if (state.uploadedAt === uploadedAt)
          state.comments = state.comments.filter((c) => c.id !== id);
      } catch (error) {
        draft.error = `Could not delete comment: ${error.message}`;
      } finally {
        draft.deleting.delete(comment.id);
        const currentPanel = document.querySelector("#opportunity-comments");
        if (isCurrent() && currentPanel) {
          const restoreFocus =
            currentPanel === panel &&
            (document.activeElement === remove ||
              document.activeElement === document.body);
          renderComments(currentPanel, clusterId, title);
          if (restoreFocus)
            currentPanel.querySelector(".comment-delete, textarea").focus();
        }
      }
    });
    add(
      list,
      add(
        el("article", "comment"),
        add(el("div", "comment-header"), time, remove),
        el("p", "comment-body", comment.body),
      ),
    );
  }
  add(panel, list);
  const form = el("form", "comment-form");
  const input = el("textarea");
  input.id = "comment-body";
  input.setAttribute("aria-label", "Add a comment");
  input.placeholder = "Add a comment…";
  input.rows = 1;
  input.maxLength = 2000;
  input.required = true;
  input.value = draft.body;
  input.disabled = draft.pending;
  const submit = add(el("button", "comment-send"), icon("send"));
  submit.type = "submit";
  submit.setAttribute("aria-label", "Post comment");
  submit.setAttribute("aria-busy", String(draft.pending));
  submit.title = draft.pending ? "Posting…" : "Post comment";
  submit.disabled = draft.pending || !draft.body.trim() || state.loading;
  const status = el("p", "small comment-status", draft.error);
  status.setAttribute("role", "status");
  input.addEventListener("input", () => {
    draft.body = input.value;
    draft.error = "";
    status.textContent = "";
    submit.disabled = !input.value.trim() || state.loading;
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    if (!submit.disabled) form.requestSubmit(submit);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (draft.pending || !draft.body.trim() || state.loading) return;
    draft.pending = true;
    draft.error = "";
    input.disabled = submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    submit.title = "Posting…";
    status.textContent = "";
    try {
      const comment = await postComment({
        run_id: run,
        cluster_id: clusterId,
        body: draft.body,
        uploadedAt,
      });
      if (state.uploadedAt === uploadedAt) state.comments.push(comment);
      draft.body = "";
    } catch (error) {
      draft.error = `Could not save comment: ${error.message}`;
    } finally {
      draft.pending = false;
      const currentPanel = document.querySelector("#opportunity-comments");
      if (isCurrent() && currentPanel) {
        renderComments(currentPanel, clusterId, title);
        if (currentPanel === panel)
          currentPanel.querySelector("textarea").focus();
      }
    }
  });
  add(form, add(el("div", "comment-composer"), input, submit), status);
  add(panel, form);
}
