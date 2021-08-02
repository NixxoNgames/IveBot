import React from 'react'
import { AppBar, Toolbar, Button, Typography } from '@material-ui/core'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { readFile } from 'fs/promises'
import { GetStaticProps } from 'next'

const ErrorPage = (props: { rootUrl: string }): JSX.Element => {
  const router = useRouter()
  return (
    <>
      <Head>
        <title>IveBot</title>
        <meta property='og:url' content={`${props.rootUrl}/error`} />
        <meta property='og:description' content='IveBot dashboard login error page...' />
        <meta name='Description' content='IveBot dashboard login error page...' />
        <meta name='robots' content='noindex,nofollow' />
      </Head>
      <AppBar>
        <Toolbar>
          <Typography variant='h6' color='inherit' style={{ flex: 1 }}>IveBot</Typography>
          <Link passHref href='/'>
            <a style={{ textDecoration: 'none', color: 'inherit' }}>
              <Button color='inherit'>Home</Button>
            </a>
          </Link>
        </Toolbar>
      </AppBar>
      <br /><br /><br /><br />
      <div style={{ padding: 10 }}>
        <Typography color='error'>
          An error occurred while logging in:
          <br />
          {router.query.error}
          <br /><br />
          <Link passHref href='/'><a>Click here to go back to the home page.</a></Link>
        </Typography>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const { rootUrl } = JSON.parse(await readFile('config.json', { encoding: 'utf8' }))
  return { props: { rootUrl: rootUrl ?? '' } }
}

export default ErrorPage
