import { extractCaptionsFromParsedXml } from "../getS3Metadata";

// Pared-down version of PMC2845662.1.xml with three representative supplementary
// material entries: one plain-text caption, one with inline markup (<xref>,
// <ext-link>), and one with a single <xref>.
const PMC2845662_XML = `<?xml version="1.0" encoding="UTF-8"?>
<article xmlns:xlink="http://www.w3.org/1999/xlink">
  <front><article-meta><title-group><article-title>Test</article-title></title-group></article-meta></front>
  <body><p>Body.</p></body>
  <back>
    <supplementary-material content-type="local-data" id="pgen.1000889.s012">
      <label>Table S1</label>
      <caption><p>List of NAD genomic coordinates (hg18 genome build) and features of their detection.</p><p>(0.03 MB XLS)</p></caption>
      <media xlink:href="pgen.1000889.s012.xls">
        <caption><p>Click here for additional data file.</p></caption>
      </media>
    </supplementary-material>
    <supplementary-material content-type="local-data" id="pgen.1000889.s014">
      <label>Table S3</label>
      <caption><p>Biological processes and molecular functions associated with NAD-located RefSeq genes. Statistical analysis of feature enrichment compared to the genome was performed using the FatiGO strategy <xref rid="pgen.1000889-AlShahrour1" ref-type="bibr">[48]</xref> included in the Babelomics suite (<ext-link ext-link-type="uri" xlink:href="http://www.babelomics.org">www.babelomics.org</ext-link>). Results are summarised in <xref ref-type="supplementary-material" rid="pgen.1000889.s003">Figure S3</xref> and <xref ref-type="supplementary-material" rid="pgen.1000889.s004">S4</xref> as graphs.</p><p>(0.02 MB XLS)</p></caption>
      <media xlink:href="pgen.1000889.s014.xls">
        <caption><p>Click here for additional data file.</p></caption>
      </media>
    </supplementary-material>
    <supplementary-material content-type="local-data" id="pgen.1000889.s018">
      <label>Table S7</label>
      <caption><p>Summary of 3D FISH experiments. BAC locations, allele and cell counts, furthermore nucleolus association frequencies in HeLa and IMR90 cells are shown. The results of transcription inhibition experiments are summarised in the lower part of the table and illustrated in <xref ref-type="supplementary-material" rid="pgen.1000889.s009">Figure S9</xref>.</p><p>(0.02 MB XLS)</p></caption>
      <media xlink:href="pgen.1000889.s018.xls">
        <caption><p>Click here for additional data file.</p></caption>
      </media>
    </supplementary-material>
  </back>
</article>`;

describe("extractCaptionsFromParsedXml", () => {
  it("extracts plain-text caption from parent supplementary-material (PMC2845662 Table S1)", () => {
    const captions = extractCaptionsFromParsedXml(PMC2845662_XML);

    expect(captions.get("pgen.1000889.s012.xls")).toBe(
      "Table S1: List of NAD genomic coordinates (hg18 genome build) and features of their detection.(0.03 MB XLS)",
    );
  });

  it("preserves inline element text in correct order (PMC2845662 Table S3 with xref and ext-link)", () => {
    const captions = extractCaptionsFromParsedXml(PMC2845662_XML);

    expect(captions.get("pgen.1000889.s014.xls")).toBe(
      "Table S3: Biological processes and molecular functions associated with NAD-located RefSeq genes. Statistical analysis of feature enrichment compared to the genome was performed using the FatiGO strategy [48] included in the Babelomics suite (www.babelomics.org). Results are summarised in Figure S3 and S4 as graphs.(0.02 MB XLS)",
    );
  });

  it("extracts caption with single xref (PMC2845662 Table S7)", () => {
    const captions = extractCaptionsFromParsedXml(PMC2845662_XML);

    expect(captions.get("pgen.1000889.s018.xls")).toBe(
      "Table S7: Summary of 3D FISH experiments. BAC locations, allele and cell counts, furthermore nucleolus association frequencies in HeLa and IMR90 cells are shown. The results of transcription inhibition experiments are summarised in the lower part of the table and illustrated in Figure S9.(0.02 MB XLS)",
    );
  });

  it("returns all three captions from the pared-down XML", () => {
    const captions = extractCaptionsFromParsedXml(PMC2845662_XML);
    expect(captions.size).toBe(3);
  });

  it("returns empty map for XML without supplementary materials", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<article xmlns:xlink="http://www.w3.org/1999/xlink">
  <front><article-meta><title-group><article-title>Test</article-title></title-group></article-meta></front>
  <body><p>Body.</p></body>
  <back></back>
</article>`;

    const captions = extractCaptionsFromParsedXml(xml);
    expect(captions.size).toBe(0);
  });

  it("returns empty map for invalid XML structure", () => {
    const captions = extractCaptionsFromParsedXml("<not-an-article />");
    expect(captions.size).toBe(0);
  });
});
