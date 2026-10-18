import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('VEHICLE_TEST_URL','http://127.0.0.1:8000/').rstrip('/')+'/'
ARTIFACTS=ROOT/'tests/artifacts';ARTIFACTS.mkdir(exist_ok=True)

async def ready(page):
 await page.locator('.contran-record').first.wait_for()

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1440,'height':1050},reduced_motion='reduce')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  m=json.loads((ROOT/'data/contran/inventory.json').read_text())['metadata']
  await page.goto(BASE+'#contran');await ready(page)
  assert str(m['currentIndicationCount']) in await page.locator('#contranResultCount').inner_text()
  assert await page.locator('.contran-record').count()==25
  assert '06/10/2026' in await page.locator('.contran-notice').inner_text()
  await page.screenshot(path=str(ARTIFACTS/'contran-desktop-verified.png'))
  await page.locator('[data-contran-page="2"]').click();await ready(page)
  assert 'página 2 de' in await page.locator('#contranResultCount').inner_text()
  await page.locator('#contranScope').select_option('all');await ready(page)
  await page.locator('#contranSearch').fill('951/2022');await page.locator('#contranFilters button[type=submit]').click();await ready(page)
  assert await page.locator('.contran-record').count()==1
  card=page.locator('[data-contran-record="contran-951-2022"]');await card.locator('summary').click()
  assert '997/2023' in await card.inner_text() or '997/23' in await card.inner_text()
  source=card.locator('.contran-actions a').first
  assert '/Resolucao9512022.pdf' in await source.get_attribute('href')
  await page.reload();await ready(page);assert '951/2022'==await page.locator('#contranSearch').input_value()
  await page.goto(BASE+'#contran?system=ocupantes');await ready(page)
  assert await page.locator('[data-contran-record="contran-951-2022"]').count()==1
  for key,text in [('contran-1029-2026','09/10/2026'),('contran-910-2022','dispositivos'),('contran-248-2007','Revogada'),('contran-827-1997','não confirmada')]:
   await page.goto(BASE+'#contran?scope=all&record='+key);await ready(page)
   assert await page.locator('.contran-record').count()==1
   assert text in await page.locator('.contran-record').inner_text(),(key,text)
  await page.goto(BASE+'#contran?scope=current&q=termo-sem-correspondencia-xyz');await page.locator('.contran-records .empty').wait_for()
  await page.locator('.empty [data-contran-clear]').click();await ready(page)
  assert str(m['recordCount']) in await page.locator('#contranResultCount').inner_text()
  async with page.expect_download() as pending:await page.locator('a[download][href$="vigencia-indicada.csv"]').click()
  download=await pending.value;assert download.suggested_filename=='vigencia-indicada.csv'
  # Real navigation from a vehicle system and from an existing catalogue reference.
  await page.goto(BASE+'#vehicle?component=bancos');await page.locator('.component-graph').wait_for()
  await page.locator('.contran-component-link a').click();await ready(page)
  assert 'system=ocupantes' in page.url
  await page.goto(BASE+'#library');await page.locator('#librarySearch').fill('951.22')
  await page.locator('[data-open="senatran-061"]').first.click();await page.locator('#normDialog').wait_for()
  await page.locator('#normDialog [data-contran-open]').click();await ready(page)
  assert not await page.locator('#normDialog').is_visible()
  assert await page.locator('[data-contran-record="contran-951-2022"]').count()==1
  await page.set_viewport_size({'width':390,'height':844})
  await page.goto(BASE+'#contran');await ready(page)
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  await page.screenshot(path=str(ARTIFACTS/'contran-mobile-verified.png'))
  await page.locator('#contranSearch').fill('970/2022');await page.locator('#contranFilters button[type=submit]').focus();await page.keyboard.press('Enter');await ready(page)
  assert await page.locator('[data-contran-record="contran-970-2022"]').count()==1
  await page.locator('.contran-record summary').focus();await page.keyboard.press('Enter')
  assert await page.locator('.contran-evidence').get_attribute('open') is not None
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  # Failure is explicit and a retry can recover without reloading the application.
  other=await browser.new_page(viewport={'width':1000,'height':900});other.on('pageerror',lambda e:errors.append(str(e)))
  await other.route('**/data/contran/inventory.json',lambda r:r.fulfill(status=503,body='unavailable'))
  await other.goto(BASE+'#contran');await other.locator('[data-contran-retry]').wait_for()
  await other.unroute('**/data/contran/inventory.json');await other.locator('[data-contran-retry]').click();await ready(other)
  assert not errors,errors
  await browser.close()
  print('PASS: CONTRAN filters, sources, amendments, temporal warnings, year identity, pagination, URL/reload, CSV, vehicle/catalogue links, mobile, keyboard, empty/error/retry. No JavaScript errors.')

asyncio.run(main())
