import { extractCaptionsFromParsedXml } from "../getS3Metadata";

// Pared-down version of PMC2845662.1.xml — caption on parent <supplementary-material>,
// "Click here" on <media>. Directly under <back>.
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

// Pared-down PMC7175788.1.xml — nested in <back>/<app-group>/<app>,
// label only (no caption), self-closing <media/>.
const PMC7175788_XML = `<?xml version="1.0" encoding="UTF-8"?>
<article xmlns:xlink="http://www.w3.org/1999/xlink">
  <front><article-meta><title-group><article-title>Test</article-title></title-group></article-meta></front>
  <body><p>Body.</p></body>
  <back>
    <app-group>
      <app id="app4">
        <supplementary-material content-type="local-data" id="app4">
          <label>Multimedia Appendix 4</label>
          <media xlink:href="jmir_v22i4e19016_app4.xlsx" xlink:title="XLSX File (Microsoft Excel File), 35 KB" id="d35e1473" position="anchor" orientation="portrait" />
        </supplementary-material>
      </app>
    </app-group>
  </back>
</article>`;

// Pared-down PMC5927771.1.xml — nested inside <body>/<sec>/<sec>/<fig>/<caption>/<p>,
// caption uses <title> instead of <p>, self-closing <media/>.
const PMC5927771_XML = `<?xml version="1.0" encoding="UTF-8"?>
<article xmlns:xlink="http://www.w3.org/1999/xlink">
  <front><article-meta><title-group><article-title>Test</article-title></title-group></article-meta></front>
  <body>
    <sec>
      <sec>
        <fig id="fig1">
          <caption>
            <p>
              <supplementary-material content-type="local-data" id="fig1sdata1">
                <label>Figure 1\u2014source data 1.</label>
                <caption><title>Numerical source data for <xref ref-type="fig" rid="fig1">Figure 1B\u20131D, E, I, J and N</xref> and <xref ref-type="fig" rid="fig1s1">Figure 1\u2014figure supplement 1B to D</xref>.</title></caption>
                <media mime-subtype="xlsx" mimetype="application" xlink:href="elife-32866-fig1-data1.xlsx" />
              </supplementary-material>
            </p>
          </caption>
        </fig>
      </sec>
    </sec>
  </body>
  <back>
    <sec>
      <supplementary-material content-type="local-data" id="supp1">
        <label>Supplementary file 1.</label>
        <caption><title>MS identification of selective Ub and pUb interactors.</title><p>Table depicting GST-4xUb interactors that are selective for S65-phosphorylated (top) or unphosphorylated (bottom) Ub.</p></caption>
        <media mime-subtype="xlsx" mimetype="application" xlink:href="elife-32866-supp1.xlsx" />
      </supplementary-material>
    </sec>
  </back>
</article>`;

// Pared-down PMC6185992.1.xml — nested in <back>/<sec>/<p>,
// no label, caption uses <title>.
const PMC6185992_XML = `<?xml version="1.0" encoding="UTF-8"?>
<article xmlns:xlink="http://www.w3.org/1999/xlink">
  <front><article-meta><title-group><article-title>Test</article-title></title-group></article-meta></front>
  <body><p>Body.</p></body>
  <back>
    <sec>
      <p>
        <supplementary-material content-type="local-data" id="ecomp20">
          <caption><title>Supplementary appendix2</title></caption>
          <media xlink:href="mmc2.xlsx" position="float" orientation="portrait" />
        </supplementary-material>
      </p>
    </sec>
  </back>
</article>`;

// Pared-down PMC7676259.1.xml — MOESM5 is inside <supplementary-material>,
// but MOESM6 is a bare <media> inside <back>/<app-group>/<app>/<sec>/<p>.
const PMC7676259_XML = `<?xml version="1.0" encoding="UTF-8"?>
<article xmlns:xlink="http://www.w3.org/1999/xlink">
  <front><article-meta><title-group><article-title>Test</article-title></title-group></article-meta></front>
  <body>
    <sec>
      <sec id="Sec27">
        <supplementary-material content-type="local-data" id="MOESM5">
          <media xlink:href="41467_2020_19701_MOESM5_ESM.xlsx" id="MOESM5">
            <caption><p>Supplementary Data 1-35</p></caption>
          </media>
        </supplementary-material>
      </sec>
    </sec>
  </body>
  <back>
    <app-group>
      <app id="App1">
        <sec id="Sec28">
          <p id="Par51">
            <media position="anchor" xlink:href="41467_2020_19701_MOESM6_ESM.xlsx" id="MOESM6" orientation="portrait">
              <caption><p>Source data</p></caption>
            </media>
          </p>
        </sec>
      </app>
    </app-group>
  </back>
</article>`;

describe("extractCaptionsFromParsedXml", () => {
  describe("PMC2845662 - caption on parent, directly under <back>", () => {
    it("extracts plain-text caption with label", () => {
      const captions = extractCaptionsFromParsedXml(PMC2845662_XML);

      expect(captions.get("pgen.1000889.s012.xls")).toBe(
        "Table S1: <p>List of NAD genomic coordinates (hg18 genome build) and features of their detection.</p><p>(0.03 MB XLS)</p>",
      );
    });

    it("preserves inline markup in correct order (xref and ext-link)", () => {
      const captions = extractCaptionsFromParsedXml(PMC2845662_XML);

      expect(captions.get("pgen.1000889.s014.xls")).toBe(
        'Table S3: <p>Biological processes and molecular functions associated with NAD-located RefSeq genes. Statistical analysis of feature enrichment compared to the genome was performed using the FatiGO strategy <xref rid="pgen.1000889-AlShahrour1" ref-type="bibr">[48]</xref> included in the Babelomics suite (<ext-link ext-link-type="uri" xlink:href="http://www.babelomics.org">www.babelomics.org</ext-link>). Results are summarised in <xref ref-type="supplementary-material" rid="pgen.1000889.s003">Figure S3</xref> and <xref ref-type="supplementary-material" rid="pgen.1000889.s004">S4</xref> as graphs.</p><p>(0.02 MB XLS)</p>',
      );
    });

    it("extracts caption with single xref", () => {
      const captions = extractCaptionsFromParsedXml(PMC2845662_XML);

      expect(captions.get("pgen.1000889.s018.xls")).toBe(
        'Table S7: <p>Summary of 3D FISH experiments. BAC locations, allele and cell counts, furthermore nucleolus association frequencies in HeLa and IMR90 cells are shown. The results of transcription inhibition experiments are summarised in the lower part of the table and illustrated in <xref ref-type="supplementary-material" rid="pgen.1000889.s009">Figure S9</xref>.</p><p>(0.02 MB XLS)</p>',
      );
    });
  });

  describe("PMC7175788 - nested in <app-group>/<app>, label only", () => {
    it("falls back to label when no caption exists", () => {
      const captions = extractCaptionsFromParsedXml(PMC7175788_XML);

      expect(captions.get("jmir_v22i4e19016_app4.xlsx")).toBe(
        "Multimedia Appendix 4",
      );
    });
  });

  describe("PMC5927771 - nested in <body>, caption uses <title>", () => {
    it("extracts caption with <title> from deeply nested supplementary-material in <body>", () => {
      const captions = extractCaptionsFromParsedXml(PMC5927771_XML);

      expect(captions.get("elife-32866-fig1-data1.xlsx")).toBe(
        'Figure 1\u2014source data 1.: <title>Numerical source data for <xref ref-type="fig" rid="fig1">Figure 1B\u20131D, E, I, J and N</xref> and <xref ref-type="fig" rid="fig1s1">Figure 1\u2014figure supplement 1B to D</xref>.</title>',
      );
    });

    it("extracts caption with both <title> and <p>", () => {
      const captions = extractCaptionsFromParsedXml(PMC5927771_XML);

      expect(captions.get("elife-32866-supp1.xlsx")).toBe(
        "Supplementary file 1.: <title>MS identification of selective Ub and pUb interactors.</title><p>Table depicting GST-4xUb interactors that are selective for S65-phosphorylated (top) or unphosphorylated (bottom) Ub.</p>",
      );
    });
  });

  describe("PMC6185992 - nested in <sec>/<p>, no label, caption uses <title>", () => {
    it("extracts caption from <title> without label", () => {
      const captions = extractCaptionsFromParsedXml(PMC6185992_XML);

      expect(captions.get("mmc2.xlsx")).toBe(
        "<title>Supplementary appendix2</title>",
      );
    });
  });

  describe("PMC7676259 - standalone <media> not wrapped in <supplementary-material>", () => {
    it("extracts caption from media inside supplementary-material", () => {
      const captions = extractCaptionsFromParsedXml(PMC7676259_XML);

      expect(captions.get("41467_2020_19701_MOESM5_ESM.xlsx")).toBe(
        "<p>Supplementary Data 1-35</p>",
      );
    });

    it("extracts caption from standalone media not in supplementary-material", () => {
      const captions = extractCaptionsFromParsedXml(PMC7676259_XML);

      expect(captions.get("41467_2020_19701_MOESM6_ESM.xlsx")).toBe(
        "<p>Source data</p>",
      );
    });
  });

  describe("edge cases", () => {
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
});
