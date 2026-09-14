"use client";

import { useEffect } from "react";
import RootHome from "../page";

const PROJECT_PATH = "/project/SP-1842";

export default function Home() {
  useEffect(() => {
    const wireProjectLinks = () => {
      const selectors = [
        "tbody tr",
        ".customerCard",
        ".revisionCard",
        ".logRow",
        ".thread",
        ".activityRow",
      ];

      document.querySelectorAll(selectors.join(",")).forEach((el) => {
        if (!el.textContent?.includes("Alex Rivera")) return;
        if (el.dataset.projectLinked === "true") return;

        el.dataset.projectLinked = "true";
        el.classList.add("demoProjectLink");
        el.setAttribute("role", "link");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", "Open Alex Rivera project SP-1842");

        const openProject = (event) => {
          if (event.target?.closest("a,button,input,select,textarea")) return;
          window.location.href = PROJECT_PATH;
        };

        el.addEventListener("click", openProject);
        el.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.location.href = PROJECT_PATH;
          }
        });

        const existingAction = el.querySelector(".miniBtn, .wideBtn, .btn.secondary");
        if (existingAction && !existingAction.dataset.projectLinked) {
          existingAction.dataset.projectLinked = "true";
          existingAction.title = "Open Alex Rivera project";
          existingAction.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            window.location.href = PROJECT_PATH;
          });
        }
      });
    };

    wireProjectLinks();
    const observer = new MutationObserver(wireProjectLinks);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <RootHome />
      <a className="demoProjectLauncher" href={PROJECT_PATH}>
        <span className="demoProjectLauncherDot" />
        <span>
          <small>DEMO PROJECT</small>
          <strong>Alex Rivera · M340i · MHD Rev 4</strong>
        </span>
        <b>Open →</b>
      </a>
      <style jsx global>{`
        .demoProjectLink {
          cursor: pointer !important;
          position: relative;
        }
        .demoProjectLink:hover {
          outline: 1px solid rgba(97,189,124,.24);
          outline-offset: -1px;
          background-color: rgba(97,189,124,.035) !important;
        }
        .demoProjectLink:focus-visible {
          outline: 2px solid #61bd7c;
          outline-offset: -2px;
        }
        .demoProjectLauncher {
          position: fixed;
          right: 22px;
          bottom: 20px;
          z-index: 60;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 310px;
          padding: 11px 13px;
          border: 1px solid #31513c;
          border-radius: 12px;
          background: rgba(17,20,18,.96);
          box-shadow: 0 18px 55px rgba(0,0,0,.42);
          backdrop-filter: blur(16px);
          color: #eef4ef;
          text-decoration: none;
        }
        .demoProjectLauncher:hover {
          border-color: #4e8b61;
          transform: translateY(-1px);
        }
        .demoProjectLauncherDot {
          width: 9px;
          height: 9px;
          flex: none;
          border-radius: 999px;
          background: #61bd7c;
          box-shadow: 0 0 14px rgba(97,189,124,.65);
        }
        .demoProjectLauncher span:nth-child(2) {
          flex: 1;
        }
        .demoProjectLauncher small {
          display: block;
          color: #61bd7c;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .15em;
          margin-bottom: 3px;
        }
        .demoProjectLauncher strong {
          display: block;
          font-size: 9px;
          font-weight: 750;
        }
        .demoProjectLauncher > b {
          color: #8cc99d;
          font-size: 8px;
          white-space: nowrap;
        }
        @media (max-width: 760px) {
          .demoProjectLauncher {
            left: 12px;
            right: 12px;
            bottom: 12px;
            min-width: 0;
          }
        }
      `}</style>
    </>
  );
}
