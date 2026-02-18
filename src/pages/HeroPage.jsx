import React from 'react';
import HtmlSection from '../components/HtmlSection';
import markup from '../legacy/markup';

export default function HeroPage() {
  return <HtmlSection html={markup.dashboard} />;
}
