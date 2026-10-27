package com.example

import android.content.Context
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("1010Tool", appName)
  }

  @Test
  fun `launch MainActivity successfully`() {
    val scenario = ActivityScenario.launch(MainActivity::class.java)
    scenario.onActivity { activity ->
      assertNotNull(activity)
    }
    scenario.close()
  }

  @Test
  fun `verify web assets and encryption libraries exist`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val assets = context.assets

    val indexHtml = assets.open("www/index.html").bufferedReader().use { it.readText() }
    assertNotNull(indexHtml)
    assert(indexHtml.contains("Password Protect")) { "index.html must contain Password Protect" }
    assert(indexHtml.contains("libs/pdf-encrypt.min.js")) { "index.html must include pdf-encrypt" }
    assert(indexHtml.contains("libs/pdf-decrypt.min.js")) { "index.html must include pdf-decrypt" }

    val encryptJs = assets.open("www/libs/pdf-encrypt.min.js").use { it.readBytes() }
    assert(encryptJs.isNotEmpty()) { "pdf-encrypt.min.js must not be empty" }

    val decryptJs = assets.open("www/libs/pdf-decrypt.min.js").use { it.readBytes() }
    assert(decryptJs.isNotEmpty()) { "pdf-decrypt.min.js must not be empty" }
  }
}
