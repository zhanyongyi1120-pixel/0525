let weatherData = null;
let regionSelect;
let myMap;
let markers = [];
let districtCoords = {}; 

const targetUrl = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-063?Authorization=CWA-1EE5B81A-9C42-4A29-8C06-D5A9FAA0A372&format=JSON&sort=time";

function setup() {
  noCanvas(); 

  myMap = L.map('map').setView([25.05, 121.53], 12); 
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(myMap);

  regionSelect = createSelect();
  regionSelect.class('p5-ui');
  
  regionSelect.style('position', 'absolute');
  regionSelect.style('top', '20px');      
  regionSelect.style('right', '20px');    
  regionSelect.style('left', 'auto');     
  regionSelect.style('font-size', '18px');
  regionSelect.style('padding', '8px');
  regionSelect.style('border-radius', '8px');
  regionSelect.style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
  regionSelect.style('cursor', 'pointer'); 
  
  regionSelect.option('資料載入中...');
  regionSelect.changed(goToRegion);

  fetch(targetUrl, {
    method: 'GET',
    headers: {
      'accept': 'application/json' 
    }
  })
    .then(response => {
      if (!response.ok) throw new Error(`伺服器回應錯誤: ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (data && data.records && data.records.Locations && data.records.Locations.length > 0) {
        weatherData = data.records.Locations[0].Location;
        setupMapData(); 
      } else {
        throw new Error("無法解析氣象署的資料結構");
      }
    })
    .catch(error => {
      console.error("API 載入失敗", error);
      regionSelect.elt.innerHTML = ''; 
      regionSelect.option('資料載入失敗，請檢查網路');
    });
}

function setupMapData() {
  regionSelect.elt.innerHTML = ''; 
  regionSelect.option('顯示全台北市 (總覽)');
  
  weatherData.forEach(station => {
    let stName = station.LocationName;
    let lat = parseFloat(station.Latitude);
    let lon = parseFloat(station.Longitude);
    
    districtCoords[stName] = [lat, lon];
    regionSelect.option(stName);

    // 新增：帶入 index 參數，用來取得不同時間區段的數值 (0為第一段，1為第二段)
    let getElementVal = (elName, index) => {
      let element = station.WeatherElement.find(e => e.ElementName === elName);
      if (element && element.Time && element.Time.length > index) {
        return element.Time[index].ElementValue[0];
      }
      return {};
    };

    // 新增：解析 API 回傳的 ISO 時間字串，轉換成乾淨的顯示格式
    let getTimeStr = (index) => {
      let element = station.WeatherElement.find(e => e.ElementName === "天氣現象");
      if (element && element.Time && element.Time.length > index) {
        // 將 "2026-05-25T12:00:00+08:00" 擷取成 "05-25 12:00" 與 "18:00"
        let start = element.Time[index].StartTime.substring(5, 16).replace("T", " ");
        let end = element.Time[index].EndTime.substring(11, 16);
        return `${start} ~ ${end}`;
      }
      return "未知時間";
    };

    // --- 第一段預報 (近期區間) ---
    let time1 = getTimeStr(0);
    let weatherDesc1 = getElementVal("天氣現象", 0).Weather || "未知";
    let pop1 = getElementVal("12小時降雨機率", 0).ProbabilityOfPrecipitation || "0";
    let temp1 = getElementVal("平均溫度", 0).Temperature || "未知";
    pop1 = pop1 === '-' ? '0' : pop1; // 處理氣象署偶爾傳回的短劃線

    // --- 第二段預報 (接下來的區間) ---
    let time2 = getTimeStr(1);
    let weatherDesc2 = getElementVal("天氣現象", 1).Weather || "未知";
    let pop2 = getElementVal("12小時降雨機率", 1).ProbabilityOfPrecipitation || "0";
    let temp2 = getElementVal("平均溫度", 1).Temperature || "未知";
    pop2 = pop2 === '-' ? '0' : pop2;

    if (lat && lon) {
      let marker = L.marker([lat, lon]).addTo(myMap);
      
      // 在 Popup 視窗中組合並排版這兩個區間的資料
      marker.bindPopup(`
        <div style="font-size:14px; line-height: 1.6; min-width: 230px;">
          <b style="font-size:16px; color:#225588;">📍 台北市 ${stName}</b><br>
          <hr style="margin: 6px 0; border: 0; border-top: 1px solid #ccc;">
          
          <b style="color:#D35400;">🗓️ ${time1}</b><br>
          🌡️ 溫度: <b>${temp1}</b> ℃ ｜ ☔ 降雨: <b>${pop1}</b> %<br>
          ☁️ 狀況: <b>${weatherDesc1}</b><br>
          
          <hr style="margin: 6px 0; border: 0; border-top: 1px dashed #ccc;">
          
          <b style="color:#D35400;">🗓️ ${time2}</b><br>
          🌡️ 溫度: <b>${temp2}</b> ℃ ｜ ☔ 降雨: <b>${pop2}</b> %<br>
          ☁️ 狀況: <b>${weatherDesc2}</b>
        </div>
      `);
      markers.push(marker);
    }
  });
}

function goToRegion() {
  let selected = regionSelect.value();
  if (selected === '顯示全台北市 (總覽)') {
    myMap.flyTo([25.05, 121.53], 12, { duration: 1.5 });
  } else {
    if (districtCoords[selected]) {
      let targetLat = districtCoords[selected][0];
      let targetLon = districtCoords[selected][1];
      myMap.flyTo([targetLat, targetLon], 14, { duration: 1.5 });
    }
  }
}