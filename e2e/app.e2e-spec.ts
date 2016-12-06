import { BvhrectDemoPage } from './app.po';

describe('bvhrect-demo App', function() {
  let page: BvhrectDemoPage;

  beforeEach(() => {
    page = new BvhrectDemoPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
