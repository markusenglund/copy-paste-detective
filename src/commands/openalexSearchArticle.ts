import { Command } from "@commander-js/extra-typings";
import { searchArticle } from "../openalex/searchArticle";

const program = new Command();

program
  .name("openalex-search-article")
  .description("Search for an article in OpenAlex")
  .argument("<title>", "Title of the article")
  .action(async (title) => {
    const article = await searchArticle(title);
    console.log(article);
    console.log(
      `${article.results[0]?.title} - ${article.results[0]?.relevance_score}`,
    );
  });

program.parse();
