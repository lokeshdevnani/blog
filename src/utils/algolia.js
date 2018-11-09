module.exports = function({ node }) {
  const {
    fields: { slug },
    frontmatter: { title, subTitle },
    internal: { content }
  } = node;

  const noEmojiContent = content.replace(/<img class="emoji-icon".+\/>/g, "");

  const record = { title, slug, content, subTitle };
  return chunkString(noEmojiContent, 5000).map((contentChunksItem, idx) => ({
    ...record,
    content: contentChunksItem,
    objectID: `${slug}${idx}`
  }));
};

function chunkString(str, length) {
  return str.match(new RegExp("(.|[\r\n]){1," + length + "}", "g"));
}
