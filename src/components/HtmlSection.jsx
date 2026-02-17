export default function HtmlSection({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
