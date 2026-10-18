import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8000/'
ARTIFACTS=Path(__file__).resolve().parent/'artifacts'
ARTIFACTS.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1440,'height':1100})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto(BASE+'#vehicle');await page.locator('[data-visual-system="freios"]').wait_for()
  assert await page.locator('[data-visual="open"]').is_disabled()
  await page.locator('[data-visual-system="freios"]').click()
  assert await page.locator('[data-visual-group]').count()==3
  await page.locator('[data-part="propulsao/emissoes"]').dispatch_event('click')
  assert await page.locator('[data-visual-group]').count()==4
  await page.locator('[data-visual-group="freios/frenagem"]').click()
  assert await page.locator('#detailDrawing').count()==0
  await page.locator('[data-visual-group="freios/fluido"]').click()
  await page.locator('[data-visual="open"]').click()
  await page.locator('#detailDrawing').wait_for()
  assert await page.locator('[data-visual-illustration]').count()==2
  assert await page.locator('button[data-visual-topic="freios/frenagem"]').get_attribute('aria-pressed')=='true'
  await page.locator('g[data-visual-topic="freios/fluido"]').click()
  assert await page.locator('button[data-visual-topic="freios/fluido"]').get_attribute('aria-pressed')=='true'
  assert await page.locator('g[aria-pressed="true"]').count()==2
  await page.locator('button[data-visual-topic="freios/estabilidade"]').click()
  assert await page.locator('g[data-visual-topic="freios/estabilidade"]').get_attribute('aria-pressed')=='true'
  await page.locator('[data-visual="plus"]').scroll_into_view_if_needed()
  before=await page.locator('.topic-panel').evaluate('(el)=>({x:el.offsetLeft,y:el.offsetTop,width:el.offsetWidth,height:el.offsetHeight})')
  await page.locator('[data-visual="plus"]').click()
  assert await page.locator('#visualZoom').inner_text()=='120%'
  assert 'scale(1.2)' in await page.locator('#drawingTransform').get_attribute('transform')
  after=await page.locator('.topic-panel').evaluate('(el)=>({x:el.offsetLeft,y:el.offsetTop,width:el.offsetWidth,height:el.offsetHeight})');assert before==after
  drawing=page.locator('#detailDrawing');await drawing.hover();await page.mouse.wheel(0,-100)
  assert await page.locator('#visualZoom').inner_text()=='140%'
  await page.locator('[data-visual="reset"]').click()
  assert await page.locator('#visualZoom').inner_text()=='100%'
  await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(ARTIFACTS/'fluxo-detalhe.png'),full_page=True)
  await page.locator('.visual-references [data-open]').first.click();assert await page.locator('#normDialog').is_visible();await page.locator('#closeDialog').click()
  await page.locator('[data-visual="clear-topics"]').click();assert await page.locator('g[aria-pressed="true"]').count()==0
  await page.locator('.visual-detail-head [data-visual="back"]').click()
  assert await page.locator('[data-visual-group][aria-pressed="true"]').count()==2
  assert await page.locator('[data-visual-system="freios"]').get_attribute('aria-pressed')=='true'
  await page.reload();await page.locator('[data-visual-group]').first.wait_for();assert await page.locator('[data-visual-group][aria-pressed="true"]').count()==2
  await page.locator('[data-visual="clear"]').click();assert await page.locator('[data-visual-group]').count()==0
  await page.locator('[data-visual-system="vidros"]').click();await page.locator('[data-visual="all"]').click();await page.locator('[data-visual="open"]').click()
  assert 'Não há ilustração detalhada' in await page.locator('#visualContent').inner_text()
  assert await page.locator('#detailDrawing').count()==0
  await page.locator('.visual-detail-head [data-visual="back"]').click();await page.go_back();await page.locator('.visual-detail').wait_for()
  await page.goto(BASE+'#vehicle?systems=invalid&groups=freios/frenagem&illustration=freios/frenagem');await page.locator('.visual-picker').wait_for();assert await page.locator('[data-visual-group]').count()==0
  # No reference data: true empty state, not unrelated records.
  await page.goto(BASE+'#vehicle?systems=freios&groups=freios/frenagem&illustration=freios/frenagem');await page.locator('#detailDrawing').wait_for()
  await page.evaluate("catalog.records=[]; vehicleUI.selected=['freios/frenagem']; renderVehicle()")
  assert 'Nenhuma referência associada' in await page.locator('.visual-references').inner_text()
  await page.reload();await page.locator('#detailDrawing').wait_for()
  await page.locator('g[data-visual-topic="freios/frenagem"]').focus();await page.keyboard.press('Enter');assert await page.locator('button[data-visual-topic="freios/frenagem"]').get_attribute('aria-pressed')=='true'
  await page.set_viewport_size({'width':390,'height':844});await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(ARTIFACTS/'fluxo-mobile.png'),full_page=True)
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Mobile horizontal overflow'
  await page.goto(BASE+'#vehicle');await page.locator('[data-visual-system="freios"]').wait_for();await page.locator('[data-visual-system="freios"]').click()
  await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(ARTIFACTS/'fluxo-grupos-mobile.png'),full_page=True)
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  # Missing resource state.
  await page.route('**/assets/brake-schematic.svg',lambda route:route.abort())
  await page.reload();await page.locator('.visual-card').first.wait_for();await page.wait_for_timeout(300)
  assert await page.locator('.no-graphic').count()>0
  await page.unroute('**/assets/brake-schematic.svg')
  for view in ['tree','mover','library','flow','updates','ai']:
   await page.goto(BASE+'#'+view);await page.locator('#main h1').wait_for()
   assert await page.locator('#main h1').inner_text()
  assert not errors,errors
  print('PASS: graphic/text selection, accumulation, explicit opening, references, zoom/wheel/reset, return/history/reload, invalid route, no-data/no-image states, keyboard and mobile layout. No JavaScript errors.')
  await browser.close()
asyncio.run(main())
