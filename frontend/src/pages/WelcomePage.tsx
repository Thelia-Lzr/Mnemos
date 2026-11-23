import React from 'react';
import { Link } from 'react-router-dom';
import ArrowOutward from '@mui/icons-material/ArrowOutward';
import AutoStoriesOutlined from '@mui/icons-material/AutoStoriesOutlined';
import companionArtwork from '../assets/mnemos-companion.webp';
import './WelcomePage.css';

const startPath = '/ai-setup';

export default function WelcomePage() {
  return (
    <div className="welcome">
      <header className="welcome-nav">
        <div className="welcome-nav-inner">
          <Link className="welcome-brand" to="/">
            <AutoStoriesOutlined aria-hidden="true" />
            Mnemos
          </Link>
          <Link className="welcome-nav-action" to={startPath}>
            进入学习 <ArrowOutward fontSize="small" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="welcome-content">
        <section className="welcome-hero" aria-labelledby="welcome-heading">
          <div className="welcome-copy">
            <h1 id="welcome-heading">
              <span className="welcome-wordmark">MNEMOS</span>
              <span className="welcome-headline">和 AI 一起，<br />把外语用起来。</span>
            </h1>
            <p>从一次对话开始。用英语、日语或法语聊你感兴趣的话题，再用专属练习和词汇复习巩固所学。</p>
            <Link className="welcome-action" to={startPath}>
              进入学习 <ArrowOutward aria-hidden="true" />
            </Link>
          </div>

          <figure className="welcome-portrait">
            <img
              src={companionArtwork}
              alt="手持笔记本的蓝紫色动漫少女，Mnemos 的 AI 学习伙伴"
              width="1024"
              height="1024"
            />
          </figure>
        </section>
      </main>
    </div>
  );
}
