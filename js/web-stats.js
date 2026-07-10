/* JS Jewelry — สถิติผู้เข้าชมเว็บ (แทนรายงานขายออก 30 วัน บนหน้าหลัก)
   ดึงจาก /api/stats (Cloudflare Pages Function + D1) · อ่านอย่างเดียว ไม่แตะชีต
   ถอยกลับ: ลบไฟล์นี้ + คืนการ์ด monthly-out ใน index.html */
(function(){
  'use strict';
  var PAGE_LABEL = { catalog:'📖 แคตตาล็อก', product:'💍 หน้าสินค้า (/p/)', order:'🛒 ฟอร์มสั่งซื้อ', other:'📄 อื่นๆ' };

  function skuName(sku){
    try{
      if (typeof products !== 'undefined' && products.length){
        var p = products.find(function(x){ return x.sku === sku; });
        if (p && p.name) return p.name;
      }
      if (typeof gems !== 'undefined' && gems.length){
        var g = gems.find(function(x){ return x.code === sku; });
        if (g && g.gemType) return g.gemType;
      }
    }catch(e){}
    return '';
  }
  function n(x){ return (Number(x)||0).toLocaleString('th-TH'); }
  function thDate(iso){
    try{ var p = iso.split('-'); return p[2] + '/' + p[1]; }catch(e){ return iso; }
  }

  window.renderWebStats = function(){
    var el = document.getElementById('web-stats');
    if (!el) return;
    fetch('/api/stats').then(function(r){ return r.json(); }).then(function(d){
      if (!d.ok) throw new Error('api');
      var html = '<div class="stats">' +
        '<div class="stat"><div class="v">' + n(d.today.u) + '</div><div class="l">ผู้เข้าชมวันนี้</div></div>' +
        '<div class="stat"><div class="v">' + n(d.today.c) + '</div><div class="l">เปิดดูวันนี้ (ครั้ง)</div></div>' +
        '<div class="stat"><div class="v">' + n(d.d7.u) + '</div><div class="l">ผู้เข้าชม 7 วัน</div></div>' +
        '<div class="stat"><div class="v">' + n(d.d30.u) + '</div><div class="l">ผู้เข้าชม 30 วัน</div></div>' +
      '</div>';

      if (!Number(d.d30.c)){
        html += '<div class="empty"><div class="ic">🌐</div>ยังไม่มีข้อมูลการเข้าชม — เริ่มนับตั้งแต่วันติดตั้งระบบ</div>';
        el.innerHTML = html; return;
      }

      var maxDay = 1, i;
      for (i = 0; i < d.daily.length; i++) maxDay = Math.max(maxDay, Number(d.daily[i].c)||0);
      var dailyRows = d.daily.map(function(r){
        return '<div class="catbar-row">' +
          '<span class="catbar-label">' + thDate(r.d) + '</span>' +
          '<div class="catbar"><div class="catbar-fill" style="width:' + Math.round((Number(r.c)||0)/maxDay*100) + '%"></div></div>' +
          '<span class="catbar-val">' + n(r.c) + '</span></div>';
      }).join('');

      var topRows = d.topSku.map(function(r, idx){
        var nm = skuName(r.sku);
        return '<tr><td class="rank">' + (idx+1) + '</td><td>' + (nm ? nm + ' ' : '') +
          '<small style="color:var(--muted)">(' + r.sku + ')</small></td>' +
          '<td class="qty">' + n(r.c) + ' ครั้ง</td></tr>';
      }).join('');

      html += '<div class="dash-2col">' +
        '<div><div class="sub-title">การเข้าชมรายวัน (14 วัน)</div>' + dailyRows + '</div>' +
        '<div><div class="sub-title">สินค้าถูกเปิดดูบ่อย (Top 5 · 30 วัน)</div>' +
          (topRows ? '<table class="mini-table"><tbody>' + topRows + '</tbody></table>'
                   : '<div class="empty" style="padding:14px 0">ยังไม่มีข้อมูลรายสินค้า</div>') +
        '</div></div>';

      var byPage = d.byPage.map(function(r){
        return '<span style="margin-right:16px">' + (PAGE_LABEL[r.page]||r.page) + ' <b>' + n(r.c) + '</b></span>';
      }).join('');
      html += '<div class="sub-title" style="margin-top:18px">แยกตามหน้า (30 วัน)</div><div style="font-size:13px">' + byPage + '</div>';

      el.innerHTML = html;
    }).catch(function(){
      el.innerHTML = '<div class="empty"><div class="ic">⚠️</div>ยังดึงสถิติไม่ได้ — ตรวจว่าตั้งค่า D1 binding (ANALYTICS) ใน Cloudflare Pages แล้ว</div>';
    });
  };

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ window.renderWebStats(); });
  } else {
    window.renderWebStats();
  }
})();
