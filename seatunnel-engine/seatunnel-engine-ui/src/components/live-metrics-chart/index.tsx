/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defineComponent, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { LiveMetricSeries } from './types'

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer
])

const COLORS = ['#4678B9', '#18A058', '#F0A020', '#D03050', '#2080F0', '#8A2BE2']

export default defineComponent({
  name: 'LiveLineChart',
  props: {
    series: {
      type: Array as PropType<LiveMetricSeries[]>,
      default: () => []
    },
    windowMs: {
      type: Number,
      default: 3 * 60 * 1000
    },
    emptyText: {
      type: String,
      default: 'No metrics'
    },
    height: {
      type: Number,
      default: 260
    }
  },
  setup(props) {
    const el = ref<HTMLDivElement>()
    let chart: echarts.ECharts | undefined

    const render = () => {
      if (!el.value) return
      if (!chart) {
        chart = echarts.init(el.value)
      }
      const series = props.series || []
      if (!series.length) {
        chart.clear()
        chart.setOption({
          title: {
            text: props.emptyText,
            left: 'center',
            top: 'middle',
            textStyle: { color: '#999', fontSize: 14, fontWeight: 'normal' }
          }
        })
        return
      }

      const now = Date.now()
      const from = now - props.windowMs

      chart.setOption(
        {
          title: { show: false },
          color: COLORS,
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: number | string) =>
              typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(4)) : String(v)
          },
          legend: {
            type: 'scroll',
            top: 0,
            data: series.map((s) => s.name)
          },
          grid: { left: 48, right: 24, top: 36, bottom: 32 },
          xAxis: {
            type: 'time',
            min: from,
            max: now,
            axisLabel: {
              formatter: (value: number) =>
                new Date(value).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })
            }
          },
          yAxis: {
            type: 'value',
            scale: true,
            splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
          },
          series: series.map((s) => ({
            name: s.name,
            type: 'line',
            showSymbol: false,
            smooth: true,
            data: [...(s.points || [])]
              .filter((p) => p.ts >= from)
              .sort((a, b) => a.ts - b.ts)
              .map((p) => [p.ts, p.value])
          }))
        },
        true
      )
    }

    const onResize = () => chart?.resize()

    onMounted(() => {
      render()
      window.addEventListener('resize', onResize)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('resize', onResize)
      chart?.dispose()
      chart = undefined
    })
    watch(
      () => [props.series, props.windowMs, props.emptyText],
      () => render(),
      { deep: true }
    )

    return () => (
      <div
        ref={el}
        class="w-full"
        style={{ height: `${props.height}px`, minHeight: `${props.height}px` }}
      />
    )
  }
})
