import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.environ.get('VEHICLE_TEST_URL','http://127.0.0.1:8000/').rstrip('/')+'/'
ARTIFACTS=Path(__file__).resolve().parent/'artifacts';ARTIFACTS.mkdir(exist_ok=True)
POINTS={'bancos':(750,350),'motor':(450,550),'tanque':(1300,900),'freios':(820,820),'chassi':(650,720),'vidros':(480,240),'iluminacao':(430,790),'carroceria':(1080,160),'retrovisores':(1180,370),'pneus-rodas':(980,870),'eletrica':(610,510),'escapamento':(900,570)}
async def point(page,xy):
 return await page.locator('#vehicleDrawing').evaluate('(svg,p)=>{const pt=svg.createSVGPoint();pt.x=p[0];pt.y=p[1];const s=pt.matrixTransform(svg.querySelector("#vehicleLayer").getScreenCTM());return {x:s.x,y:s.y}}',list(xy))
async def overview(page):
 await page.goto(BASE+'#vehicle');await page.locator('#vehicleDrawing').wait_for();await page.evaluate('document.fonts.ready');await page.wait_for_timeout(150)
async def flow(page):
 await page.locator('.component-graph').wait_for();await page.wait_for_timeout(300)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=await browser.new_page(viewport={'width':1440,'height':1100},reduced_motion='reduce')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await overview(page)
  assert await page.locator('.component-card').count()==14
  # Hit-testing actual transformed SVG geometry: each physical point must land on its own region.
  for name,xy in POINTS.items():
   pos=await point(page,xy);actual=await page.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.closest("[data-component-link]")?.dataset.componentLink',pos);assert actual==name,(name,actual)
  # Tire outlines must include the tire edge while excluding adjacent white pixels.
  wheel_samples=[((980,870),True),((875,900),True),((1430,620),True),((1060,850),False),((970,995),False),((1460,730),False)]
  async def wheel_boundaries(samples):
   for xy,inside in samples:
    pos=await point(page,xy)
    actual=await page.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.closest("[data-component-link]")?.dataset.componentLink',pos)
    assert (actual=='pneus-rodas')==inside,(xy,inside,actual)
  await wheel_boundaries(wheel_samples)
  pseat=await point(page,POINTS['bancos']);await page.mouse.move(**pseat);assert 'Bancos' in await page.locator('#componentHover').inner_text()
  await page.locator('[data-vehicle-zoom="in"]').click();assert await page.locator('#vehicleImageZoom').inner_text()=='120%'
  await wheel_boundaries(wheel_samples[:2]+[wheel_samples[3]])
  pseat=await point(page,POINTS['bancos']);assert await page.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.closest("[data-component-link]")?.dataset.componentLink',pseat)=='bancos'
  await page.locator('[data-vehicle-zoom="reset"]').click();assert await page.locator('#vehicleImageZoom').inner_text()=='100%'
  await page.mouse.move(0,0);await page.screenshot(path=str(ARTIFACTS/'veiculo-desktop.png'),full_page=True)
  pseat=await point(page,POINTS['bancos']);await page.mouse.click(**pseat);await flow(page)
  assert await page.locator('#main h1').inner_text()=='Bancos e ocupantes'
  assert await page.locator('[data-tree-node="component:bancos:seguranca:ancoragem:record:senatran-061"]').count()==1
  await page.locator('[data-tree-node="component:bancos:seguranca:materiais"]').click();await flow(page)
  assert 'NBR' in await page.locator('#aiPanel').inner_text() or await page.locator('[data-tree-node$=":gap:0"]').count()==1
  await page.locator('[data-tree-node="component:bancos:seguranca:materiais:gap:0"]').click();assert 'NBR' in await page.locator('#aiPanel').inner_text();assert await page.locator('#aiPanel .tree-doc').count()==0
  await page.locator('[data-tree-node="component:bancos:seguranca:materiais:record:senatran-092"]').click();await page.locator('#aiPanel .tree-detail-footer [data-open]').click();assert await page.locator('#normDialog').is_visible();await page.locator('#closeDialog').click()
  await page.locator('[data-tree-node="component:bancos:seguranca:ancoragem"]').click();await flow(page);await page.screenshot(path=str(ARTIFACTS/'bancos-fluxograma.png'),full_page=True)
  # URL preserves branch/node and context on reload and across navigation.
  saved=page.url;await page.reload();await flow(page);assert page.url==saved
  await page.locator('[data-vehicle-back]').click();await page.locator('#vehicleDrawing').wait_for();await page.go_back();await flow(page);assert 'component=bancos' in page.url
  await overview(page);await page.locator('.component-card[data-component-link="motor"]').click();await flow(page)
  assert await page.locator('.component-lanes a').count()==2
  await page.locator('.component-lanes a',has_text='Ambiental').click();await flow(page)
  assert 'Ambiental' in await page.locator('.component-lanes .active').inner_text()
  assert await page.locator('[data-tree-node="component:motor:ambiental:gases:record:ibama-042"]').count()==1
  await page.screenshot(path=str(ARTIFACTS/'motor-ambiental.png'),full_page=True)
  await page.locator('.component-lanes a',has_text='Segurança').click();await flow(page);assert await page.locator('[data-tree-node$=":record:inmetro-045"]').count()==1
  await overview(page);tank=await point(page,POINTS['tanque']);await page.mouse.click(**tank);await flow(page);assert await page.locator('[data-tree-node$=":record:senatran-118"]').count()==1
  await page.locator('.component-lanes a',has_text='Ambiental').click();await flow(page);assert await page.locator('[data-tree-node$=":record:ibama-031"]').count()==1
  await page.locator('[data-tree-node="component:tanque:ambiental:canister"]').click();assert await page.locator('#aiPanel .tree-doc').count()==0
  # Graph zoom is independent of hero image; reset and fit are usable.
  art=await page.locator('.component-hero-art').evaluate('(e)=>({width:e.offsetWidth,height:e.offsetHeight})');await page.locator('[data-graph-action="in"]').click();assert await page.locator('.component-hero-art').evaluate('(e)=>({width:e.offsetWidth,height:e.offsetHeight})')==art
  await page.locator('[data-graph-action="fit"]').click();await page.locator('[data-graph-action="reset"]').click()
  for component in POINTS:
   await page.goto(BASE+'#vehicle?component='+component);await flow(page);assert await page.locator('#main h1').inner_text()
  # Keyboard alternative and real clicks on mobile (no document overflow).
  await page.set_viewport_size({'width':390,'height':844});await overview(page)
  await wheel_boundaries(wheel_samples)
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  await page.screenshot(path=str(ARTIFACTS/'veiculo-mobile.png'),full_page=True)
  seat=await point(page,POINTS['bancos']);await page.mouse.click(**seat);await flow(page)
  assert await page.locator('#main h1').inner_text()=='Bancos e ocupantes'
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  await page.screenshot(path=str(ARTIFACTS/'bancos-mobile.png'),full_page=True)
  await overview(page);link=page.locator('.component-card[data-component-link="motor"]');await link.focus();await page.keyboard.press('Enter');await flow(page);assert 'Motor' in await page.locator('#main h1').inner_text()
  await page.locator('.component-lanes a',has_text='Ambiental').focus();await page.keyboard.press('Enter');await flow(page);assert vehicle_url_has(page,'lane=ambiental')
  await page.goto(BASE+'#vehicle?component=missing');await page.locator('#vehicleDrawing').wait_for();assert 'Componente não encontrado' in await page.locator('#main [role=status]').inner_text()
  await page.goto(BASE+'#vehicle?component=motor');await flow(page);await page.evaluate('catalog.records=[];renderVehicle()');assert await page.locator('#aiPanel .tree-doc').count()==0;assert 'pendente' in (await page.locator('.graph-node strong').all_inner_texts())[-1].lower()
  await page.route('**/assets/motor.webp',lambda route:route.abort());await page.reload();await flow(page);await page.locator('.image-unavailable').first.wait_for();await page.unroute('**/assets/motor.webp')
  # Existing application views remain intact.
  for view in ['tree','mover','library','flow','updates','ai']:
   await page.goto(BASE+'#'+view);await page.locator('#main h1').wait_for();assert await page.locator('#main h1').inner_text()
  # Real touch-capable browser context and motion-enabled transition smoke.
  touch=await browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
  touch.on('pageerror',lambda e:errors.append(str(e)))
  await overview(touch);pos=await point(touch,POINTS['bancos']);await touch.touchscreen.tap(pos['x'],pos['y']);await flow(touch)
  assert 'Bancos' in await touch.locator('#main h1').inner_text()
  viewport=touch.locator('#graphViewport');await viewport.evaluate('(v)=>v.scrollLeft=120');assert await viewport.evaluate('(v)=>v.scrollLeft')==120
  await touch.close()
  await page.set_viewport_size({'width':1440,'height':1100});await page.emulate_media(reduced_motion='no-preference')
  await overview(page);await page.locator('.component-card[data-component-link="motor"]').click();await flow(page)
  await page.wait_for_function('!document.documentElement.classList.contains("transitioning")')
  assert 'Motor' in await page.locator('#main h1').inner_text()
  assert not errors,errors
  print('PASS: 12 original SVG hit targets plus 14 component entries, image zoom/reset, bank/engine/tank flows, reference/gap provenance, source dialog, graph controls, URL/reload/back, keyboard, mobile clicks/layout, missing image/data and 6 existing views. No JavaScript errors.')
  await browser.close()
def vehicle_url_has(page,value):return value in page.url
asyncio.run(main())
